/**
 * Gemini API 클라이언트
 * Frontend에서 직접 호출하여 캐릭터 정보를 자동 생성합니다.
 */

import { GEMINI_CONFIG } from "@/lib/config/character"
import { toAppError } from "@/lib/api/errors"

const GEMINI_API_KEY = GEMINI_CONFIG.API_KEY;
const GEMINI_API_URL = GEMINI_CONFIG.API_URL;

export interface CharacterSpec {
    name: string;
    gender: string;
    species: string;
    age: string;
    height: string;
    job: string;
    personality: string;
    appearance: string;
    description: string;
    worldview: string; // 신규 추가
    likes: string[];
    dislikes: string[];
    speech_style: string;
    thoughts: string;
    features: string;
    habits: string;
    guidelines: string;
}

/**
 * 재시도 로직 (지수 백오프)
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: unknown
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            
            // 마지막 시도가 아니면 대기
            if (attempt < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, attempt)
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }
    }
    
    throw lastError
}

export interface DetailedCharacterInput {
    name: string;
    category: string;     // 카테고리 (필수)
    source_work: string;  // 작품명 (필수) - 신규 추가
    concept?: string;     // 사용자가 입력하지 않을 수도 있음 (AI가 추론)
    worldview?: string;
    gender?: string;
    species?: string;
}

/**
 * 사용자 입력 정보를 바탕으로 캐릭터의 상세 스펙을 JSON 객체로 생성합니다.
 */
export async function generateCharacterSpec(
    input: DetailedCharacterInput
): Promise<CharacterSpec> {
    // API KEY 디버깅 로그 (보안을 위해 일부만 출력하거나 길이만 출력)
    if (!GEMINI_API_KEY) {
        console.error("Gemini API Key is missing!");
        throw new Error("Gemini API 키가 설정되지 않았습니다.");
    }

    const { name, category, source_work, concept = "", worldview = "", gender = "", species = "" } = input;

    const prompt = `당신은 창의적인 캐릭터 설정 전문가입니다.
사용자가 제공한 정보를 바탕으로 캐릭터의 상세 설정을 한국어로 작성하여 JSON 형식으로 응답해주세요.
특히 '작품명'이 제공되면 해당 작품의 '이름'을 가진 캐릭터 정보를 정확하게 찾아서 채워주세요. (없는 작품이면 창작해주세요)

## 입력 정보
- 이름: ${name}
- 카테고리: ${category}
- 작품명(출처): ${source_work}
${concept ? `- 추가 컨셉: ${concept}` : ""}
${worldview ? `- 세계관: ${worldview}` : ""}

## 요구사항
다음 JSON 스키마를 정확히 따라주세요. 모든 필드는 필수입니다.
빈칸이 없도록 내용을 풍부하게 채워주세요. 작품의 고증을 철저히 지켜주세요.
{
  "name": "캐릭터 이름",
  "gender": "성별",
  "species": "종족",
  "age": "나이 (예: 14세)",
  "height": "키 (예: 148cm)",
  "job": "직업",
  "worldview": "세계관 (예: 해리포터 세계관, 마법이 존재하는 현대 등)",
  "personality": "성격 (콤마로 구분된 특성들 10개 이상 나열)",
  "appearance": "외모 (머리, 눈, 체형, 복장 등 상세 묘사)",
  "description": "설명 (캐릭터의 배경 스토리와 현재 상황 3-5문장)",
  "likes": ["좋아하는 것 1", "좋아하는 것 2", ... (8개 이상)],
  "dislikes": ["싫어하는 것 1", "싫어하는 것 2", ... (5개 이상)],
  "speech_style": "말투 (구체적인 어조, 어미, 특징 상세 설명)",
  "thoughts": "생각 (대표적인 속마음 대사 3개 이상, 인용구로 표현)",
  "features": "특징 (행동 패턴, 독특한 습관 등)",
  "habits": "말버릇 (자주 쓰는 감탄사나 의성어)",
  "guidelines": "가이드라인 (롤플레이 시 주의할 점 3-5항목)"
}

응답은 오직 JSON 형식이어야 합니다. 마크다운 코드 블록(\`\`\`json)으로 감싸주세요.`;

    return retryWithBackoff(async () => {
        const response = await fetch(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error: ${response.statusText} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) throw new Error("No text response from Gemini");

        // JSON 파싱
        let jsonText = text.trim();
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        try {
            return JSON.parse(jsonText) as CharacterSpec;
        } catch (e) {
            console.error("JSON Parse Error:", jsonText);
            throw new Error("Gemini 응답을 JSON으로 파싱할 수 없습니다.");
        }
    }, 3, 1000);
}
