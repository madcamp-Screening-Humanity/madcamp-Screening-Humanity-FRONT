/**
 * Gemini API 클라이언트
 * Frontend에서 직접 호출하여 캐릭터 정보를 자동 생성합니다.
 */

import { GEMINI_CONFIG } from "@/lib/config/character"
import { toAppError, ErrorCode } from "@/lib/api/errors"

const GEMINI_API_KEY = GEMINI_CONFIG.API_KEY;
const GEMINI_API_URL = GEMINI_CONFIG.API_URL;

export interface GeneratedCharacter {
    name: string;
    persona: string;
    description: string;
    category?: string;
    tags?: string[];
    sample_dialogue?: string;
}

/**
 * 작품명과 캐릭터명을 기반으로 Gemini API를 통해 캐릭터 정보를 자동 생성합니다.
 * @param workName 작품명 (선택적)
 * @param characterName 캐릭터명
 * @returns 생성된 캐릭터 정보
 */
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

export async function generateCharacterFromReference(
    workName: string | null,
    characterName: string
): Promise<GeneratedCharacter> {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API 키가 설정되지 않았습니다. NEXT_PUBLIC_GEMINI_API_KEY 환경 변수를 확인해주세요.");
    }

    // 프롬프트 구성
    const workContext = workName ? `${workName}의 ` : "";
    const prompt = `${workContext}${characterName} 캐릭터에 대한 상세한 정보를 JSON 형식으로 생성해주세요.

다음 필드들을 포함해야 합니다:
- name: 캐릭터 이름
- persona: 캐릭터의 성격, 말투, 행동 패턴을 상세히 설명 (200자 이상). 다음 형식으로 작성:
  * 성격: [주요 성격 특성]
  * 말투: [사용하는 말투와 어미]
  * 배경: [캐릭터의 배경이나 설정]
  * 목표: [캐릭터의 목표나 동기]
- description: 캐릭터에 대한 간단한 설명 (50자 이내)
- category: 카테고리 (애니메이션, 소설, 영화 등)
- tags: 태그 배열 (최대 5개)
- sample_dialogue: 캐릭터의 말투를 보여주는 샘플 대화 (1-2문장)

중요: persona 필드는 반드시 "성격:", "말투:", "배경:", "목표:" 형식으로 구조화하여 작성해주세요.
JSON 형식으로만 응답해주세요. 다른 설명은 포함하지 마세요.`;

    return retryWithBackoff(async () => {
        try {
            const response = await fetch(
                `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt,
                                    },
                                ],
                            },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const appError = toAppError(
                    new Error(`Gemini API 호출 실패: ${response.status} ${response.statusText}`)
                )
                appError.details = errorData
                throw appError
            }

            const data = await response.json();
            
            // Gemini API 응답에서 텍스트 추출
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw toAppError(new Error("Gemini API 응답에서 텍스트를 찾을 수 없습니다."))
            }

            // JSON 파싱 (마크다운 코드 블록 제거)
            let jsonText = text.trim();
            if (jsonText.startsWith("```json")) {
                jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            } else if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
            }

            const characterData = JSON.parse(jsonText) as GeneratedCharacter;

            // 필수 필드 검증
            if (!characterData.name || !characterData.persona) {
                throw toAppError(new Error("생성된 캐릭터 정보에 필수 필드가 누락되었습니다."))
            }

            return characterData;
        } catch (error) {
            // 이미 AppError인 경우 그대로 throw
            if (error && typeof error === "object" && "code" in error) {
                throw error
            }
            // 그 외의 경우 AppError로 변환
            throw toAppError(error)
        }
    }, 3, 1000) // 최대 3회 재시도, 초기 지연 1초
}
