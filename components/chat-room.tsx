"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/lib/store"
import { chatApi } from "@/lib/api/client"
import { useToast } from "@/hooks/use-toast"
import { useTTS } from "@/hooks/use-tts"
import { TtsSettingsModal } from "@/components/tts-settings-modal"
import { checkBackendHealth } from "@/lib/api/health-check"
import { buildSystemPersona } from "@/lib/utils/persona-builder"
import {
  Send,
  Lightbulb,
  X,
  RotateCcw,
  Home,
  Play,
  Settings,
  Volume2,
} from "lucide-react"

function SimpleAvatar({ isUser = false }: { isUser?: boolean }) {
  const color = isUser ? "#3b82f6" : "#ef4444"

  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#e8d4c4" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <capsuleGeometry args={[0.35, 0.6, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.5, 0.8, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.5, 0.8, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.12, 1.55, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.12, 1.55, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

function AvatarScene({ isUser = false }: { isUser?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <SimpleAvatar isUser={isUser} />
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.3}
        scale={3}
        blur={2}
        far={4}
      />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
      />
      <Environment preset="studio" />
    </>
  )
}

export function ChatRoom() {
  const {
    step,
    scenario,
    messages,
    addMessage,
    turnCount,
    incrementTurn,
    resetGame,
    goToHome,
    saveChatHistory,
    displayName,
    userName,
    selectedCharacter,
    secondCharacter,
    gameMode,
    ttsMode,
    ttsDelayMs,
    ttsStreamingMode,
    ttsEnabled,
    ttsSpeed,
    sessionId,
    setSessionId,
    generatedScript,
    chatModel,
  } = useAppStore()
  const { toast } = useToast()
  const { play: playAudio, isPlaying, stop: stopAudio } = useTTS()

  const [input, setInput] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [showTtsSettings, setShowTtsSettings] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState<"character1" | "character2">("character1")
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 턴 제한 및 평가 관련 상태
  // Gemini 모델 사용 시 20턴 제한, 그 외(Ollama)는 무제한
  const isGemini = chatModel?.startsWith("gemini-")
  const maxTurns = isGemini ? 20 : 9999

  const [evaluationResult, setEvaluationResult] = useState<{ summary: string; score: number; comment: string } | null>(null)
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [firstDialogueError, setFirstDialogueError] = useState(false)
  const [directorFirstDialogueError, setDirectorFirstDialogueError] = useState(false)

  const isVisible = step === "chat"
  const isDirectorMode = gameMode === "director"
  const myName = displayName || userName || "나"

  // 감독 모드에서 두 캐릭터 이름
  const character1Name = selectedCharacter?.name || "캐릭터1"
  const character2Name = secondCharacter?.name || "캐릭터2"

  useEffect(() => {
    if (isVisible && !sessionId) {
      const newSessionId = crypto.randomUUID()
      setSessionId(newSessionId)
    }
  }, [isVisible, sessionId, setSessionId])

  useEffect(() => {
    if (isVisible && messages.length === 0 && selectedCharacter && sessionId) {
      if (isDirectorMode && secondCharacter) {
        if (!directorFirstDialogueError) {
        // 감독 모드: 두 캐릭터가 대화 시작
        const startDirectorConversation = async () => {
          try {
            // 첫 번째 캐릭터가 먼저 말하기
            // 감독 모드용 프롬프트: 상대방을 인간으로 인식하고 자연스럽게 대화
            const directorPersona1 = `${buildSystemPersona(selectedCharacter)}

중요: 당신은 ${character1Name}입니다. ${character2Name}은(는) 당신과 대화하는 실제 사람입니다. 
${character2Name}을(를) 분석하거나 해석하지 말고, ${character2Name}의 말에 직접적으로 반응하며 자연스럽게 대화하세요.
당신의 캐릭터 성격에 맞게 말하되, ${character2Name}과(와) 마치 실제 사람과 대화하는 것처럼 자연스럽게 대화하세요.`

            const response1 = await chatApi.chat({
              messages: [
                { role: "system", content: `당신은 ${character1Name}입니다. ${character2Name}과(와) 대화를 시작하세요. ${character2Name}은(는) 실제 사람입니다. 분석하거나 해석하지 말고 직접적으로 대화하세요.` },
                { role: "user", content: `${character2Name}과(와) 대화를 시작해줘. 너의 첫 마디로 시작해.` }
              ],
              persona: directorPersona1,
              character_id: selectedCharacter.id,
              scenario: {
                opponent: character2Name,
                situation: generatedScript || scenario.situation,
                ...(scenario.background ? { background: scenario.background } : {}),
              },
              session_id: sessionId || undefined,
              tts_enabled: ttsEnabled,
              tts_mode: ttsMode,
              tts_delay_ms: ttsDelayMs,
              tts_streaming_mode: ttsStreamingMode,
              tts_speed: ttsSpeed,
              temperature: 0.7,
              max_tokens: 512,
              model: chatModel || undefined,
            })

            if (response1.success && response1.data?.content) {
              const firstMessageId = Date.now().toString()
              addMessage({
                id: firstMessageId,
                role: "assistant",
                content: response1.data.content.trim(),
                audio_url: response1.data.audio_url,
                timestamp: new Date(),
                emotion: character1Name, // 어떤 캐릭터인지 표시
              })
              // 감독 모드: 첫 번째 캐릭터는 턴 증가 안 함 (두 번째 캐릭터가 말한 후에 증가)
              setCurrentSpeaker("character2")
              setLastProcessedMessageId(firstMessageId) // 처리한 메시지 ID 저장

              if (ttsMode === "realtime" && response1.data.audio_url) {
                const audioUrl = response1.data.audio_url.startsWith("http")
                  ? response1.data.audio_url
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response1.data.audio_url}`
                playAudio(audioUrl)
              } else if (ttsMode === "delayed" && response1.data.audio_url) {
                const audioUrl = response1.data.audio_url.startsWith("http")
                  ? response1.data.audio_url
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response1.data.audio_url}`
                setTimeout(() => playAudio(audioUrl), ttsDelayMs)
              }

              // 잠시 후 두 번째 캐릭터가 응답
              setTimeout(async () => {
                try {
                  // 감독 모드용 프롬프트: 상대방을 인간으로 인식하고 자연스럽게 대화
                  const directorPersona2 = `${buildSystemPersona(secondCharacter)}

중요: 당신은 ${character2Name}입니다. ${character1Name}은(는) 당신과 대화하는 실제 사람입니다.
${character1Name}을(를) 분석하거나 해석하지 말고, ${character1Name}의 말에 직접적으로 반응하며 자연스럽게 대화하세요.
당신의 캐릭터 성격에 맞게 말하되, ${character1Name}과(와) 마치 실제 사람과 대화하는 것처럼 자연스럽게 대화하세요.`

                  const response2 = await chatApi.chat({
                    messages: [
                      { role: "system", content: `당신은 ${character2Name}입니다. ${character1Name}이(가) 방금 말했습니다. ${character1Name}은(는) 실제 사람입니다. 분석하거나 해석하지 말고 직접적으로 대화하세요.` },
                      { role: "assistant", content: response1.data?.content?.trim() || "" },
                      { role: "user", content: `${character1Name}의 말에 자연스럽게 반응해줘.` }
                    ],
                    persona: directorPersona2,
                    character_id: secondCharacter.id,
                    scenario: {
                      opponent: character1Name,
                      situation: generatedScript || scenario.situation,
                      ...(scenario.background ? { background: scenario.background } : {}),
                    },
                    session_id: sessionId || undefined,
                    tts_enabled: ttsEnabled,
                    tts_mode: ttsMode,
                    tts_delay_ms: ttsDelayMs,
                    tts_streaming_mode: ttsStreamingMode,
                    tts_speed: ttsSpeed,
                    temperature: 0.7,
                    max_tokens: 512,
                    model: chatModel || undefined,
                  })

                  if (response2.success && response2.data?.content) {
                    const secondMessageId = (Date.now() + 1).toString()
                    addMessage({
                      id: secondMessageId,
                      role: "assistant",
                      content: response2.data.content.trim(),
                      audio_url: response2.data.audio_url,
                      timestamp: new Date(),
                      emotion: character2Name,
                    })
                    // 감독 모드: 두 번째 캐릭터가 말한 후에 1턴 증가 (1턴 = 2개 메시지)
                    incrementTurn()
                    setCurrentSpeaker("character1")
                    setLastProcessedMessageId(secondMessageId) // 처리한 메시지 ID 저장

                    if (ttsMode === "realtime" && response2.data.audio_url) {
                      const audioUrl = response2.data.audio_url.startsWith("http")
                        ? response2.data.audio_url
                        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response2.data.audio_url}`
                      playAudio(audioUrl)
                    } else if (ttsMode === "delayed" && response2.data.audio_url) {
                      const audioUrl = response2.data.audio_url.startsWith("http")
                        ? response2.data.audio_url
                        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response2.data.audio_url}`
                      setTimeout(() => playAudio(audioUrl), ttsDelayMs)
                    }
                  }
                } catch (error) {
                  console.error("두 번째 캐릭터 응답 오류:", error)
                }
              }, 2000)
            } else {
              throw new Error(response1?.error?.message || "초기 메시지 생성 실패")
            }
          } catch (error) {
            console.error("감독 모드 초기 대화 오류:", error)
            setDirectorFirstDialogueError(true)
          }
        }

        startDirectorConversation()
        }
      } else {
        // 주연 모드: 첫 대사 AI 생성 (sample_dialogue 제거)
        if (!firstDialogueError) {
        const generateInitialMessage = async () => {
          try {
            const response = await chatApi.chat({
              messages: [],
              persona: buildSystemPersona(selectedCharacter),
              character_id: selectedCharacter.id,
              scenario: {
                opponent: scenario.opponent,
                situation: generatedScript || scenario.situation,
                ...(scenario.background ? { background: scenario.background } : {}),
              },
              session_id: sessionId || undefined,
              tts_enabled: ttsEnabled,
              tts_mode: ttsMode,
              tts_delay_ms: ttsDelayMs,
              tts_streaming_mode: ttsStreamingMode,
              tts_speed: ttsSpeed,
              temperature: 0.7,
              max_tokens: 512,
              model: chatModel || undefined,
            })

            if (response.success && response.data?.content) {
              addMessage({
                id: Date.now().toString(),
                role: "assistant",
                content: response.data.content.trim(),
                audio_url: response.data.audio_url,
                timestamp: new Date(),
              })
              incrementTurn()

              if (ttsMode === "realtime" && response.data.audio_url) {
                const audioUrl = response.data.audio_url.startsWith("http")
                  ? response.data.audio_url
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response.data.audio_url}`
                playAudio(audioUrl)
              } else if (ttsMode === "delayed" && response.data.audio_url) {
                const audioUrl = response.data.audio_url.startsWith("http")
                  ? response.data.audio_url
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response.data.audio_url}`
                setTimeout(() => playAudio(audioUrl), ttsDelayMs)
              }
            } else {
              throw new Error(response?.error?.message || "초기 메시지 생성 실패")
            }
          } catch (error) {
            console.error("초기 메시지 생성 오류:", error)
            setFirstDialogueError(true)
          }
        }

        generateInitialMessage()
        }
      }
    }
  }, [isVisible, selectedCharacter, secondCharacter, isDirectorMode, sessionId, scenario, ttsEnabled, ttsMode, ttsDelayMs, ttsStreamingMode, ttsSpeed, addMessage, incrementTurn, playAudio, generatedScript, character1Name, character2Name, firstDialogueError, directorFirstDialogueError, chatModel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 감독 모드: 자동으로 대화가 이어지도록
  useEffect(() => {
    if (!isVisible || !isDirectorMode || !secondCharacter || !selectedCharacter) return
    if (turnCount >= maxTurns) return
    if (isAiTyping) return // 이미 응답 생성 중이면 스킵
    if (!sessionId) return
    if (messages.length === 0) return // 메시지가 없으면 스킵

    // 마지막 메시지가 assistant이고, 감독 모드 메시지(emotion이 있음)인지 확인
    const lastMessage = messages[messages.length - 1]

    // 이미 처리한 메시지면 스킵
    if (lastMessage && lastMessage.id === lastProcessedMessageId) return

    // 마지막 메시지가 assistant이고 캐릭터 이름이 있어야 함 (감독 모드 메시지)
    // 그리고 이전 메시지와 다른 캐릭터여야 함 (같은 캐릭터가 연속으로 말하지 않도록)
    const secondLastMessage = messages[messages.length - 2]
    const isDifferentCharacter = !secondLastMessage ||
      secondLastMessage.role !== "assistant" ||
      secondLastMessage.emotion !== lastMessage.emotion

    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.emotion && // 캐릭터 이름이 있으면 감독 모드 메시지
      isDifferentCharacter && // 다른 캐릭터가 말해야 함
      messages.length >= 1 // 최소 1개 메시지가 있어야 함
    ) {
      // 자동으로 다음 캐릭터가 응답
      const nextSpeaker = lastMessage.emotion === character1Name ? "character2" : "character1"
      const nextCharacter = nextSpeaker === "character1" ? selectedCharacter : secondCharacter
      const nextOpponent = nextSpeaker === "character1" ? secondCharacter : selectedCharacter

      if (nextCharacter && turnCount < maxTurns) {
        setIsAiTyping(true)

        setTimeout(async () => {
          try {
            const nextDirectorPersona = `${buildSystemPersona(nextCharacter)}

중요: 당신은 ${nextCharacter.name}입니다. ${nextOpponent?.name}은(는) 당신과 대화하는 실제 사람입니다.
${nextOpponent?.name}을(를) 분석하거나 해석하지 말고, ${nextOpponent?.name}의 말에 직접적으로 반응하며 자연스럽게 대화하세요.
당신의 캐릭터 성격에 맞게 말하되, ${nextOpponent?.name}과(와) 마치 실제 사람과 대화하는 것처럼 자연스럽게 대화하세요.`

            // 최근 대화 히스토리 (마지막 메시지 포함)
            const recentMessages = messages
              .filter(msg => msg.role === "assistant" && msg.emotion) // 감독 모드 메시지만
              .slice(-5) // 최근 5개 메시지
              .map((msg) => ({
                role: "assistant" as const,
                content: msg.content
              }))

            // 상대방의 마지막 메시지 찾기
            const opponentLastMessage = messages
              .filter(msg => msg.role === "assistant" && msg.emotion === nextOpponent?.name)
              .slice(-1)[0]

            const autoResponse = await chatApi.chat({
              messages: [
                { role: "system", content: `당신은 ${nextCharacter.name}입니다. ${nextOpponent?.name}은(는) 실제 사람입니다. 분석하거나 해석하지 말고 직접적으로 대화하세요.` },
                ...recentMessages,
                ...(opponentLastMessage ? [{ role: "assistant" as const, content: opponentLastMessage.content }] : []),
                { role: "user", content: `${nextOpponent?.name}의 말에 자연스럽게 반응해줘.` }
              ],
              persona: nextDirectorPersona,
              character_id: nextCharacter.id,
              scenario: {
                opponent: nextOpponent?.name || "",
                situation: generatedScript || scenario.situation,
                ...(scenario.background ? { background: scenario.background } : {}),
              },
              session_id: sessionId || undefined,
              tts_enabled: ttsEnabled,
              tts_mode: ttsMode,
              tts_delay_ms: ttsDelayMs,
              tts_streaming_mode: ttsStreamingMode,
              tts_speed: ttsSpeed,
              temperature: 0.7,
              max_tokens: 512,
              model: chatModel || undefined,
            })

            if (autoResponse.success && autoResponse.data) {
              const autoMessage = {
                id: (Date.now() + Math.random()).toString(),
                role: "assistant" as const,
                content: autoResponse.data.content.trim(),
                audio_url: autoResponse.data.audio_url,
                timestamp: new Date(),
                emotion: nextCharacter.name,
              }
              addMessage(autoMessage)
              // 감독 모드: character2가 말한 후에만 턴 증가 (1턴 = 2개 메시지)
              if (nextSpeaker === "character1") {
                incrementTurn()
              }
              setCurrentSpeaker(nextSpeaker)
              setLastProcessedMessageId(autoMessage.id) // 처리한 메시지 ID 저장
              saveChatHistory()

              if (autoResponse.data.audio_url) {
                const audioUrl = autoResponse.data.audio_url.startsWith("http")
                  ? autoResponse.data.audio_url
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${autoResponse.data.audio_url}`

                if (ttsMode === "realtime") {
                  setTimeout(() => playAudio(audioUrl), 100)
                } else if (ttsMode === "delayed" && ttsDelayMs > 0) {
                  setTimeout(() => playAudio(audioUrl), ttsDelayMs)
                }
              }
            }
          } catch (error) {
            console.error("자동 대화 오류:", error)
          } finally {
            setIsAiTyping(false)
          }
        }, 2000) // 2초 후 자동 응답
      }
    }
  }, [messages, isVisible, isDirectorMode, secondCharacter, selectedCharacter, turnCount, maxTurns, isAiTyping, lastProcessedMessageId, character1Name, character2Name, sessionId, ttsEnabled, ttsMode, ttsDelayMs, ttsStreamingMode, ttsSpeed, addMessage, incrementTurn, saveChatHistory, playAudio, generatedScript, scenario, chatModel])

  useEffect(() => {
    if (turnCount >= maxTurns && !showEndModal) {
      saveChatHistory()
      setShowEndModal(true)
    }
  }, [turnCount, maxTurns, showEndModal, saveChatHistory])

  const retryWithBackoff = useCallback(async (
    fn: () => Promise<any>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<any> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxRetries - 1) throw error
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || turnCount >= maxTurns || !sessionId) return

    const currentInput = input
    setInput("")
    setRetryCount(0)
    setIsAiTyping(true)

    if (isDirectorMode && secondCharacter) {
      // 감독 모드: 사용자 메시지는 중재/부추김 메시지로 표시
      const directorMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: `[감독 중재] ${currentInput}`,
        timestamp: new Date(),
      }
      addMessage(directorMessage)

      try {
        // 현재 말할 차례인 캐릭터가 응답
        const currentCharacter = currentSpeaker === "character1" ? selectedCharacter : secondCharacter
        const opponentCharacter = currentSpeaker === "character1" ? secondCharacter : selectedCharacter

        const response = await retryWithBackoff(async () => {
          // 감독 모드용 프롬프트: 상대방을 인간으로 인식하고 자연스럽게 대화
          const directorPersona = `${buildSystemPersona(currentCharacter!)}

중요: 당신은 ${currentCharacter?.name}입니다. ${opponentCharacter?.name}은(는) 당신과 대화하는 실제 사람입니다.
${opponentCharacter?.name}을(를) 분석하거나 해석하지 말고, ${opponentCharacter?.name}의 말에 직접적으로 반응하며 자연스럽게 대화하세요.
당신의 캐릭터 성격에 맞게 말하되, ${opponentCharacter?.name}과(와) 마치 실제 사람과 대화하는 것처럼 자연스럽게 대화하세요.`

          // 대화 히스토리 구성 (감독 메시지 포함)
          const conversationHistory = messages
            .filter(msg => msg.role === "assistant" || (msg.role === "user" && msg.content.startsWith("[감독 중재]")))
            .map((msg) => {
              if (msg.role === "user" && msg.content.startsWith("[감독 중재]")) {
                return {
                  role: "system" as const,
                  content: `[감독의 중재/부추김]: ${msg.content.replace("[감독 중재] ", "")}`
                }
              }
              return {
                role: "assistant" as const,
                content: msg.content
              }
            })

          const result = await chatApi.chat({
            messages: [
              { role: "system", content: `당신은 ${currentCharacter?.name}입니다. ${opponentCharacter?.name}은(는) 실제 사람입니다. 분석하거나 해석하지 말고 직접적으로 대화하세요.` },
              ...conversationHistory,
              { role: "system" as const, content: `[감독의 중재/부추김]: ${currentInput}` },
              { role: "user" as const, content: `${opponentCharacter?.name}의 말에 자연스럽게 반응하거나, 감독의 중재에 따라 대화를 이어가세요.` }
            ],
            persona: directorPersona,
            character_id: currentCharacter?.id,
            scenario: {
              opponent: opponentCharacter?.name || "",
              situation: generatedScript || scenario.situation,
              ...(scenario.background ? { background: scenario.background } : {}),
            },
            session_id: sessionId || undefined,
            tts_enabled: ttsEnabled,
            tts_mode: ttsMode,
            tts_delay_ms: ttsDelayMs,
            tts_streaming_mode: ttsStreamingMode,
            tts_speed: ttsSpeed,
            temperature: 0.7,
            max_tokens: 512,
            model: chatModel || undefined,
          })
          if (!result || !result.success || !result.data?.content) {
            throw new Error(result?.error?.message || "채팅 응답 실패")
          }
          return result
        }, 3, 1000)

        if (response.success && response.data) {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: response.data.content.trim(),
            audio_url: response.data.audio_url,
            timestamp: new Date(),
            emotion: currentCharacter?.name,
          }
          addMessage(aiMessage)
          // 감독 모드: character2가 말한 후에만 턴 증가 (1턴 = 2개 메시지)
          const nextSpeaker = currentSpeaker === "character1" ? "character2" : "character1"
          if (nextSpeaker === "character1") {
            incrementTurn()
          }
          setCurrentSpeaker(nextSpeaker)
          saveChatHistory()

          if (response.data.audio_url) {
            const audioUrl = response.data.audio_url.startsWith("http")
              ? response.data.audio_url
              : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response.data.audio_url}`

            if (ttsMode === "realtime") {
              setTimeout(() => playAudio(audioUrl), 100)
            } else if (ttsMode === "delayed" && ttsDelayMs > 0) {
              setTimeout(() => playAudio(audioUrl), ttsDelayMs)
            }
          }

          setLastProcessedMessageId(aiMessage.id) // 처리한 메시지 ID 저장
        }
      } catch (error) {
        console.error("채팅 오류:", error)
        toast({
          title: "채팅 오류",
          description: error instanceof Error ? error.message : "오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsAiTyping(false)
      }
    } else {
      // 주연 모드: 기존 로직
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: currentInput,
        timestamp: new Date(),
      }

      addMessage(userMessage)
      incrementTurn()

      try {
        const response = await retryWithBackoff(async () => {
          const result = await chatApi.chat({
            messages: [
              ...messages.map((msg) => ({
                role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant" | "system",
                content: msg.content,
              })),
              { role: "user" as const, content: currentInput },
            ],
            persona: buildSystemPersona(selectedCharacter!) || undefined,
            character_id: selectedCharacter?.id,
            scenario: {
              opponent: scenario.opponent,
              situation: generatedScript || scenario.situation,
              ...(scenario.background ? { background: scenario.background } : {}),
            },
            session_id: sessionId || undefined,
            tts_enabled: ttsEnabled,
            tts_mode: ttsMode,
            tts_delay_ms: ttsDelayMs,
            tts_streaming_mode: ttsStreamingMode,
            tts_speed: ttsSpeed,
            temperature: 0.7,
            max_tokens: 512,
            model: chatModel || undefined,
          })
          if (!result || !result.success || !result.data?.content) {
            throw new Error(result?.error?.message || "채팅 응답 실패")
          }
          return result
        }, 3, 1000)

        if (response.success && response.data) {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: response.data.content.trim(),
            audio_url: response.data.audio_url,
            timestamp: new Date(),
          }
          addMessage(aiMessage)
          incrementTurn()
          saveChatHistory()

          if (response.data.audio_url) {
            const audioUrl = response.data.audio_url.startsWith("http")
              ? response.data.audio_url
              : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response.data.audio_url}`

            if (ttsMode === "realtime") {
              setTimeout(() => playAudio(audioUrl), 100)
            } else if (ttsMode === "delayed" && ttsDelayMs > 0) {
              setTimeout(() => playAudio(audioUrl), ttsDelayMs)
            }
          }
        }
      } catch (error) {
        console.error("채팅 오류:", error)
        toast({
          title: "채팅 오류",
          description: error instanceof Error ? error.message : "오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsAiTyping(false)
      }
    }
  }, [input, turnCount, maxTurns, sessionId, messages, selectedCharacter, secondCharacter, isDirectorMode, currentSpeaker, scenario, ttsEnabled, ttsMode, ttsDelayMs, ttsStreamingMode, ttsSpeed, addMessage, incrementTurn, saveChatHistory, playAudio, retryWithBackoff, toast, generatedScript, character1Name, character2Name, chatModel])

  const handleMessageClick = useCallback((message: { id: string; audio_url?: string }) => {
    if (ttsMode === "on_click" && message.audio_url) {
      const audioUrl = message.audio_url.startsWith("http")
        ? message.audio_url
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${message.audio_url}`
      playAudio(audioUrl)
      setPlayingMessageId(message.id)
    }
  }, [ttsMode, playAudio])

  const handleHintSelect = (hint: string) => {
    setInput(hint)
    setShowHints(false)
  }

  // 평가하기 핸들러
  const handleEvaluate = async () => {
    if (isEvaluating) return

    if (!selectedCharacter) {
      toast({
        title: "오류 발생",
        description: "캐릭터 정보를 찾을 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    setIsEvaluating(true)

    try {
      const evalSystemPrompt = `
당신은 ${selectedCharacter.name} 본인입니다.
지금까지의 대화 내용을 바탕으로 상대방(${isDirectorMode ? '감독' : (scenario.opponent || '사용자')})과의 대화를 평가해주세요.
제3자나 AI가 아닌, **${selectedCharacter.name} 캐릭터 본인의 시점과 말투**로 평가해야 합니다.

다음 JSON 형식으로 만 응답해주세요(마크다운 없이 순수 JSON만):
{
  "summary": "지난 ${maxTurns}턴 동안의 대화 내용을 3줄로 간략히 요약 (다음 대화를 이어가기 위한 줄거리)",
  "score": 0에서 100 사이의 숫자 (호감도 및 몰입도 점수),
  "comment": "상대방에 대한 솔직한 한줄 평 (캐릭터 말투 유지)"
}`

      const messagesForEval = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "system" as const, content: evalSystemPrompt }
      ]

      const response = await chatApi.chat({
        messages: messagesForEval,
        character_id: selectedCharacter!.id,
        session_id: sessionId || undefined,
        tts_speed: ttsSpeed,
        temperature: 0.7,
        max_tokens: 512,
        scenario: { opponent: scenario.opponent || "", situation: "" },
        model: chatModel || undefined,
      })

      if (response.success && response.data?.content) {
        let jsonStr = response.data.content
        jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim()

        try {
          const result = JSON.parse(jsonStr)
          setEvaluationResult(result)
          setShowEndModal(false)
          setShowEvaluationModal(true)
        } catch (e) {
          console.error("JSON 파싱 실패:", e)
          setEvaluationResult({
            summary: "요약 정보를 불러오지 못했습니다.",
            score: 50,
            comment: response.data.content
          })
          setShowEndModal(false)
          setShowEvaluationModal(true)
        }
      }
    } catch (error) {
      console.error("평가 생성 실패:", error)
      toast({
        title: "평가 실패",
        description: "평가를 받아오는 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  // 이어하기 핸들러 (UI용)
  const handleContinueTalk = () => {
    if (!evaluationResult) return
    setShowEvaluationModal(false)
    setEvaluationResult(null)
    useAppStore.getState().setTurnCount(0)
    toast({ title: "이어하기", description: "대화가 계속됩니다. (컨텍스트 압축: 미구현)" })
  }

  // 중복 핸들러 제거됨

  const handleContinue = () => setShowEndModal(false)
  const handleNewPlay = () => { setShowEndModal(false); saveChatHistory(); resetGame(); }
  const handleQuit = () => { setShowEndModal(false); saveChatHistory(); goToHome(); }
  const handleEndButton = () => { saveChatHistory(); setShowEndModal(true); }

  if (!isVisible) return null

  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      <header className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {isDirectorMode && secondCharacter
              ? `${character1Name} vs ${character2Name}`
              : scenario.opponent}
          </h1>
          <p className="text-xs text-muted-foreground line-clamp-1">{scenario.situation}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className={`font-bold ${turnCount >= maxTurns ? "text-destructive" : "text-primary"}`}>{turnCount}</span>
            <span className="text-muted-foreground"> / {maxTurns} 턴</span>
            {isGemini && (
              <span className="text-[10px] text-amber-500 border border-amber-500/50 px-1 rounded ml-1">Limit</span>
            )}
            {isDirectorMode && secondCharacter && (
              <span className="text-xs text-muted-foreground ml-1">(1턴 = 2개 대화)</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTtsSettings(true)} className="border-border">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleEndButton} className="border-border">
            종료
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 h-64 border-b border-border">
        <div className="relative border-r border-border bg-secondary/20">
          <Canvas camera={{ position: [0, 1, 2.5], fov: 50 }}>
            <Suspense fallback={null}><AvatarScene isUser={false} /></Suspense>
          </Canvas>
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-card/80 backdrop-blur-sm rounded text-xs">
            {isDirectorMode && secondCharacter ? character1Name : scenario.opponent}
          </div>
        </div>
        <div className="relative bg-secondary/20">
          <Canvas camera={{ position: [0, 1, 2.5], fov: 50 }}>
            <Suspense fallback={null}><AvatarScene isUser={!isDirectorMode} /></Suspense>
          </Canvas>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-card/80 backdrop-blur-sm rounded text-xs">
            {isDirectorMode && secondCharacter ? character2Name : myName}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (firstDialogueError || directorFirstDialogueError) && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-muted-foreground">첫 대사 생성에 실패했습니다.</p>
            <Button
              variant="outline"
              onClick={() => {
                setFirstDialogueError(false)
                setDirectorFirstDialogueError(false)
              }}
            >
              재시도
            </Button>
          </div>
        )}
        {messages.map((msg) => {
          const isDirectorUserMsg = isDirectorMode && msg.role === "user" && msg.content.startsWith("[감독 중재]")
          const characterName = msg.emotion || (msg.role === "assistant" && isDirectorMode ? (currentSpeaker === "character1" ? character2Name : character1Name) : null)
          // 캐릭터별 위치 결정: character1은 왼쪽, character2는 오른쪽
          const isLeftCharacter = msg.emotion === character1Name
          const isRightCharacter = msg.emotion === character2Name
          const shouldAlignLeft = isDirectorUserMsg || (isDirectorMode && msg.role === "assistant" && isLeftCharacter)
          const shouldAlignRight = (!isDirectorMode && msg.role === "user") || (isDirectorMode && msg.role === "assistant" && isRightCharacter)

          return (
            <div key={msg.id} className={`flex ${shouldAlignRight ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] flex flex-col">
                {characterName && (
                  <span className={`text-xs text-muted-foreground mb-1 px-1 ${shouldAlignRight ? "text-right" : "text-left"}`}>
                    {characterName}
                  </span>
                )}
                {isDirectorUserMsg && (
                  <span className="text-xs text-primary mb-1 px-1">
                    감독 중재
                  </span>
                )}
                <div className="relative">
                  <div
                    className={`px-4 py-3 rounded-2xl relative group ${isDirectorUserMsg
                      ? "bg-primary/20 text-foreground border border-primary/30 rounded-bl-md"
                      : msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border rounded-bl-md text-foreground"
                      } ${ttsMode === "on_click" && msg.audio_url ? "cursor-pointer" : ""}`}
                    onClick={() => handleMessageClick(msg)}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {isDirectorUserMsg ? msg.content.replace("[감독 중재] ", "") : msg.content}
                    </p>
                    {msg.audio_url && (
                      <div className="absolute -bottom-1 -right-1">
                        <Volume2 className={`h-3 w-3 ${playingMessageId === msg.id && isPlaying ? "text-primary animate-pulse" : "text-muted-foreground opacity-50"}`} />
                      </div>
                    )}
                  </div>
                  {/* 감독 중재(수정하기) 버튼 제거됨 */}
                </div>
              </div>
            </div>
          )
        })}
        {isAiTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md animate-pulse text-xs text-muted-foreground">
              AI가 응답을 생성하는 중입니다...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showHints && (
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /><span className="text-sm font-medium">추천 대사</span></div>
            <button onClick={() => setShowHints(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="space-y-2">
            {["네, 알겠습니다.", "다시 한번 설명해 주시겠어요?", "좋은 의견이네요."].map((hint, idx) => (
              <button key={idx} onClick={() => handleHintSelect(hint)} className="w-full text-left px-3 py-2 rounded-lg bg-secondary/50 text-sm hover:bg-secondary">
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border bg-card space-y-3">
        <div className="flex justify-end">
          <button onClick={() => setShowHints(!showHints)} className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:border-primary transition-colors">힌트 보기</button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                turnCount >= maxTurns 
                  ? "대화가 종료되었습니다."
                  : isDirectorMode && secondCharacter 
                    ? "중재나 부추김 메시지를 입력하세요..." 
                    : "대사를 입력하세요..."
              }
              disabled={turnCount >= maxTurns}
              className="flex-1 bg-secondary/50"
            />
            <Button onClick={handleSend} disabled={!input.trim() || turnCount >= maxTurns} className="bg-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
          </div>
          {turnCount >= maxTurns && isGemini && (
            <p className="text-xs text-destructive text-center">
              Gemini 모델은 20번 대화로 제한됩니다. 20번을 모두 사용했습니다.
            </p>
          )}
        </div>
      </div>

      {showEndModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-6 relative">
            {turnCount < maxTurns && (
              <button
                onClick={() => setShowEndModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <h2 className="text-2xl font-bold text-center">
              {turnCount >= maxTurns ? "대화 종료" : "연극 종료"}
            </h2>
            <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
              <p className="text-center text-muted-foreground whitespace-pre-wrap">
                {turnCount >= maxTurns
                  ? `${maxTurns}턴의 대화가 모두 끝났습니다.\n캐릭터에게 대화에 대한 평가를 받아보세요!`
                  : "현재 연극을 종료하고 평가를 받으시겠습니까?"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleNewPlay}>
                <Home className="mr-2 h-4 w-4" />
                처음으로
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleEvaluate}
                disabled={isEvaluating}
              >
                {isEvaluating ? "평가 중..." : "평가받기"}
                {!isEvaluating && <Lightbulb className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 평가 결과 모달 */}
      {showEvaluationModal && evaluationResult && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-primary">대화 평가 결과</h2>
              <p className="text-sm text-muted-foreground">By. {selectedCharacter?.name}</p>
            </div>

            <div className="space-y-4">
              {/* 점수 */}
              <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-xl">
                <span className="text-sm text-muted-foreground mb-1">호감도 & 몰입도</span>
                <span className="text-5xl font-black text-primary">{evaluationResult.score}</span>
                <span className="text-sm text-muted-foreground mt-1">/ 100점</span>
              </div>

              {/* 한줄 평 */}
              <div className="relative p-4 bg-primary/10 rounded-xl">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl"></div>
                <p className="font-medium text-foreground italic">"{evaluationResult.comment}"</p>
              </div>

              {/* 요약 */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">대화 요약</span>
                <p className="text-sm text-foreground/80 leading-relaxed bg-secondary/20 p-3 rounded-lg">
                  {evaluationResult.summary}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleNewPlay}>
                종료하기
              </Button>
              <Button className="flex-1" onClick={handleContinueTalk}>
                이어하기
                <RotateCcw className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {showTtsSettings && <TtsSettingsModal open={showTtsSettings} onOpenChange={setShowTtsSettings} />}

      {/* 감독 중재 모달 제거됨 */}
    </div>
  )
}