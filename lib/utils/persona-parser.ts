/**
 * Persona 파서 유틸리티
 * AI 생성된 persona 텍스트를 구조화된 필드로 파싱합니다.
 */

export interface ParsedPersona {
  personality: string
  speechStyle: string
  background: string
  goals: string
}

/**
 * Persona 텍스트를 구조화된 필드로 파싱합니다.
 * @param personaText 원본 persona 텍스트
 * @returns 파싱된 필드들
 */
export function parsePersona(personaText: string): ParsedPersona {
  const result: ParsedPersona = {
    personality: "",
    speechStyle: "",
    background: "",
    goals: "",
  }

  if (!personaText || !personaText.trim()) {
    return result
  }

  // 줄바꿈으로 분리
  const lines = personaText.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 0)

  let currentField: keyof ParsedPersona | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    // 필드 시작 패턴 확인
    if (line.match(/^성격\s*[:：]/i)) {
      if (currentField) {
        result[currentField] = currentContent.join("\n").trim()
      }
      currentField = "personality"
      currentContent = [line.replace(/^성격\s*[:：]\s*/i, "").trim()]
    } else if (line.match(/^말투\s*[:：]/i)) {
      if (currentField) {
        result[currentField] = currentContent.join("\n").trim()
      }
      currentField = "speechStyle"
      currentContent = [line.replace(/^말투\s*[:：]\s*/i, "").trim()]
    } else if (line.match(/^배경\s*[:：]/i)) {
      if (currentField) {
        result[currentField] = currentContent.join("\n").trim()
      }
      currentField = "background"
      currentContent = [line.replace(/^배경\s*[:：]\s*/i, "").trim()]
    } else if (line.match(/^목표\s*[:：]/i)) {
      if (currentField) {
        result[currentField] = currentContent.join("\n").trim()
      }
      currentField = "goals"
      currentContent = [line.replace(/^목표\s*[:：]\s*/i, "").trim()]
    } else if (currentField) {
      // 현재 필드의 연속 내용
      currentContent.push(line)
    } else {
      // 필드가 지정되지 않은 경우, 첫 번째 줄을 성격으로 간주
      if (!result.personality) {
        currentField = "personality"
        currentContent = [line]
      }
    }
  }

  // 마지막 필드 저장
  if (currentField && currentContent.length > 0) {
    result[currentField] = currentContent.join("\n").trim()
  }

  // 파싱된 내용이 없으면 원본 텍스트를 성격 필드에 할당
  if (!result.personality && !result.speechStyle && !result.background && !result.goals) {
    result.personality = personaText.trim()
  }

  return result
}

/**
 * 구조화된 필드들을 persona 텍스트로 통합합니다.
 * @param parsed 파싱된 필드들
 * @returns 통합된 persona 텍스트
 */
export function buildPersonaFromParsed(parsed: ParsedPersona): string {
  const parts: string[] = []
  
  if (parsed.personality.trim()) {
    parts.push(`성격: ${parsed.personality}`)
  }
  if (parsed.speechStyle.trim()) {
    parts.push(`말투: ${parsed.speechStyle}`)
  }
  if (parsed.background.trim()) {
    parts.push(`배경: ${parsed.background}`)
  }
  if (parsed.goals.trim()) {
    parts.push(`목표: ${parsed.goals}`)
  }

  return parts.join("\n")
}
