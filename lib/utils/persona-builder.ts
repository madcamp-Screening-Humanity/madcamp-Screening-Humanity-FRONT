import { Character } from "@/lib/api/types";

/** s.length <= max면 그대로, 아니면 앞 (max-3)자 + "..." */
function truncateAt(s: string, max: number): string {
    if (!s || s.length <= max) return s;
    return s.slice(0, max - 3) + "...";
}

/**
 * 4k 컨텍스트 최적화: 필드별 상한 적용
 * 핵심 필드(말투/성격/습관)는 보존, 그 외는 압축
 */
export function buildSystemPersona(character: Character, situation?: string): string {
    const parts: string[] = [];

    // 기본 정보 (짧음, 그대로)
    if (character.gender) parts.push(`성별:${character.gender}`);
    if (character.species) parts.push(`종:${character.species}`);
    if (character.job) parts.push(`직업:${character.job}`);
    if (character.age) parts.push(`나이:${character.age}`);

    // 핵심 필드 (무압축 또는 높은 상한) - 말투/성격/습관은 캐릭터 유지에 필수
    if (character.speech_style) parts.push(`말투: ${truncateAt(character.speech_style, 150)}`);
    if (character.personality) parts.push(`성격: ${truncateAt(character.personality, 150)}`);
    if (character.habits) parts.push(`말버릇: ${truncateAt(character.habits, 100)}`);

    // 보조 필드 (압축)
    if (character.appearance) parts.push(`외모: ${truncateAt(character.appearance, 80)}`);
    if (character.description) parts.push(`설명: ${truncateAt(character.description, 60)}`);
    if (character.features) parts.push(`특징: ${truncateAt(character.features, 80)}`);
    if (character.thoughts) parts.push(`생각: ${truncateAt(character.thoughts, 80)}`);

    // 리스트 항목 (압축)
    if (character.likes && character.likes.length > 0) {
        const likes = Array.isArray(character.likes) ? character.likes.join(",") : character.likes;
        parts.push(`좋아함: ${truncateAt(likes, 80)}`);
    }
    if (character.dislikes && character.dislikes.length > 0) {
        const dislikes = Array.isArray(character.dislikes) ? character.dislikes.join(",") : character.dislikes;
        parts.push(`싫어함: ${truncateAt(dislikes, 80)}`);
    }

    // 가이드라인 (중요, 적당히 압축)
    if (character.guidelines) {
        parts.push(`[가이드]\n${truncateAt(character.guidelines, 200)}`);
    }

    return parts.join(" | ");
}
