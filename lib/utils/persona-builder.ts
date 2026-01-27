import { Character } from "@/lib/api/types";

/** s.length <= max면 그대로, 아니면 앞 (max-3)자 + "..." */
function truncateAt(s: string, max: number): string {
    if (!s || s.length <= max) return s;
    return s.slice(0, max - 3) + "...";
}

/**
 * 캐릭터의 상세 정보를 바탕으로 LLM에게 보낼 시스템 페르소나 텍스트를 생성합니다.
 * 저장된 'persona' 필드 대신, 각 상세 필드를 조합하여 항상 최신 상태를 반영합니다.
 * speech_style, personality, habits는 무압축. 나머지 필드는 계획 상한 적용.
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

    // 상세 설정 (personality 무압축, appearance 500, description 300 - 32K Context 대응 상향)
    if (character.personality) parts.push(`성격: ${character.personality}`);
    if (character.appearance) parts.push(`외모: ${truncateAt(character.appearance, 500)}`);
    if (character.description) parts.push(`설명: ${truncateAt(character.description, 300)}`);

    // 리스트 항목 (join 후 likes 500, dislikes 500)
    if (character.likes && character.likes.length > 0) {
        const raw = Array.isArray(character.likes) ? character.likes.join(", ") : character.likes;
        parts.push(`좋아하는 것: ${truncateAt(raw, 500)}`);
    }
    if (character.dislikes && character.dislikes.length > 0) {
        const raw = Array.isArray(character.dislikes) ? character.dislikes.join(", ") : character.dislikes;
        parts.push(`싫어하는 것: ${truncateAt(raw, 500)}`);
    }

    // 말투·내면 (speech_style, habits 무압축, thoughts 500, features 500)
    if (character.speech_style) parts.push(`말투: ${character.speech_style}`);
    if (character.thoughts) parts.push(`생각: ${truncateAt(character.thoughts, 500)}`);
    if (character.features) parts.push(`특징: ${truncateAt(character.features, 500)}`);
    if (character.habits) parts.push(`${character.name}의 말버릇: ${character.habits}`);

    // 세계관·출처 (worldview 1000, source_work 100)
    if (character.worldview) parts.push(`세계관: ${truncateAt(character.worldview, 1000)}`);
    if (character.source_work) parts.push(`출처/작품: ${truncateAt(character.source_work, 100)}`);

    // 가이드라인 (1000)
    if (character.guidelines) {
        parts.push(`${character.name}의 캐릭터 가이드라인:\n${truncateAt(character.guidelines, 1000)}`);
    }

    return parts.join("\n\n");
}
