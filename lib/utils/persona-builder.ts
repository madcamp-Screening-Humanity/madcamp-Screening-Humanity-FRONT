import { Character } from "@/lib/api/types";

/**
 * 캐릭터의 상세 정보를 바탕으로 LLM에게 보낼 시스템 페르소나 텍스트를 생성합니다.
 * 저장된 'persona' 필드 대신, 각 상세 필드를 조합하여 항상 최신 상태를 반영합니다.
 */
export function buildSystemPersona(character: Character): string {
    // 상세 정보가 없고 기존 persona만 있는 경우 (하위 호환)
    if (!character.personality && character.persona) {
        return character.persona;
    }

    const parts: string[] = [];

    // 기본 정보
    parts.push(`캐릭터 이름: ${character.name}`);
    if (character.gender) parts.push(`성별: ${character.gender}`);
    if (character.species) parts.push(`종: ${character.species}`);
    if (character.job) parts.push(`직업: ${character.job}`);
    if (character.age) parts.push(`나이: ${character.age}`);
    if (character.height) parts.push(`키: ${character.height}`);

    // 상세 설정
    if (character.personality) parts.push(`성격: ${character.personality}`);
    if (character.appearance) parts.push(`외모: ${character.appearance}`);
    if (character.description) parts.push(`설명: ${character.description}`);
    
    // 리스트 항목
    if (character.likes && character.likes.length > 0) {
        // 배열이거나 문자열일 수 있음 (안전하게 처리)
        const likes = Array.isArray(character.likes) ? character.likes.join(", ") : character.likes;
        parts.push(`좋아하는 것: ${likes}`);
    }
    if (character.dislikes && character.dislikes.length > 0) {
        const dislikes = Array.isArray(character.dislikes) ? character.dislikes.join(", ") : character.dislikes;
        parts.push(`싫어하는 것: ${dislikes}`);
    }
    
    // 말투 및 내면
    if (character.speech_style) parts.push(`말투: ${character.speech_style}`);
    if (character.thoughts) parts.push(`생각: ${character.thoughts}`);
    if (character.features) parts.push(`특징: ${character.features}`);
    if (character.habits) parts.push(`${character.name}의 말버릇: ${character.habits}`);
    
    // 가이드라인
    if (character.guidelines) {
        parts.push(`${character.name}의 캐릭터 가이드라인:\n${character.guidelines}`);
    }

    return parts.join("\n\n");
}
