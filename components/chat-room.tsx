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
    // TTS 설정
    ttsMode,
    ttsDelayMs,
    ttsStreamingMode,
    ttsEnabled,
    sessionId,
    setSessionId,
    // 턴 제한
    maxTurns,
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isVisible = step === "chat"
  const myName = displayName || userName || "나"
  
  // 세션 ID 초기화 (채팅방 시작 시)
  useEffect(() => {
    if (isVisible && !sessionId) {
      const newSessionId = crypto.randomUUID()
      setSessionId(newSessionId)
      if (process.env.NODE_ENV === "development") {
        console.log("세션 ID 생성:", newSessionId)
      }
    }
  }, [isVisible, sessionId, setSessionId])

  // 초기 메시지 생성 (하드코딩 제거)
  useEffect(() => {
    if (isVisible && messages.length === 0 && selectedCharacter && sessionId) {
      // sample_dialogue가 있으면 우선 사용
      if (selectedCharacter.sample_dialogue) {
        addMessage({
          id: Date.now().toString(),
          role: "ai",
          content: selectedCharacter.sample_dialogue,
          timestamp: new Date(),
        })
        incrementTurn()
        return
      }
      
      // API로 초기 인사 생성
      const generateInitialMessage = async () => {
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("초기 메시지 생성 시작:", {
              persona: selectedCharacter.persona?.substring(0, 50),
              character_id: selectedCharacter.id,
              scenario: scenario,
            })
          }
          
          const response = await chatApi.chat({
            messages: [],
            persona: selectedCharacter.persona,
            character_id: selectedCharacter.id,
            scenario: {
              opponent: scenario.opponent,
              situation: scenario.situation,
              background: scenario.background,
            },
            session_id: sessionId,
            tts_enabled: ttsEnabled,
            tts_mode: ttsMode,
            tts_delay_ms: ttsDelayMs,
            tts_streaming_mode: ttsStreamingMode,
            temperature: 0.7,
            max_tokens: 512,
          })
          
          if (process.env.NODE_ENV === "development") {
            console.log("초기 메시지 응답:", {
              success: response.success,
              has_content: !!response.data?.content,
              has_audio: !!response.data?.audio_url,
            })
          }
          
          // 응답 검증
          if (!response || !response.success) {
            throw new Error(response?.error?.message || "초기 메시지 생성 실패")
          }
          
          if (!response.data || !response.data.content) {
            throw new Error("응답 데이터가 없거나 내용이 비어있습니다.")
          }
          
          addMessage({
            id: Date.now().toString(),
            role: "ai",
            content: response.data.content.trim(),  // 앞뒤 공백 제거
            audio_url: response.data.audio_url,
            timestamp: new Date(),
          })
          incrementTurn()
          
          // 실시간 TTS 재생 (tts_mode === "realtime"이고 audio_url이 있을 때)
          if (ttsMode === "realtime" && response.data.audio_url) {
            setTimeout(() => {
              // audio_url이 상대 경로일 수 있으므로 절대 URL로 변환
              const audioUrl = response.data.audio_url!.startsWith("http")
                ? response.data.audio_url!
                : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response.data.audio_url}`
              playAudio(audioUrl)
            }, 100)
          }
        } catch (error) {
          console.error("초기 메시지 생성 오류:", error)
          
          // Toast로 에러 표시 (선택적)
          if (process.env.NODE_ENV === "development") {
            toast({
              title: "초기 메시지 생성 오류",
              description: error instanceof Error ? error.message : "초기 메시지 생성 중 오류가 발생했습니다.",
              variant: "destructive",
            })
          }
          
          // Fallback: 기본 인사
          addMessage({
            id: Date.now().toString(),
            role: "ai",
            content: `안녕하세요. ${scenario.opponent}입니다. 무슨 일이시죠?`,
            timestamp: new Date(),
          })
          incrementTurn()
        }
      }
      
      generateInitialMessage()
    }
  }, [isVisible, selectedCharacter, sessionId, scenario, ttsEnabled, ttsMode, ttsDelayMs, ttsStreamingMode, addMessage, incrementTurn, playAudio])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (turnCount >= maxTurns && !showEndModal) {
      saveChatHistory()
      setShowEndModal(true)
    }
  }, [turnCount, maxTurns, showEndModal, saveChatHistory])

  // 재시도 메커니즘 (지수 백오프)
  const retryWithBackoff = useCallback(async (
    fn: () => Promise<any>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<any> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error
        }
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || turnCount >= maxTurns || !sessionId) return

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input,
      timestamp: new Date(),
    }

    addMessage(userMessage)
    incrementTurn()
    const currentInput = input
    setInput("")
    setRetryCount(0)

    // AI 타이핑 상태 설정 (에러 발생 시에도 반드시 해제되도록 try-finally 사용)
    setIsAiTyping(true)

    try {
      // 개발 환경에서 로깅
      if (process.env.NODE_ENV === "development") {
        console.log("채팅 요청 전송:", {
          messages_count: messages.length + 1,
          persona: selectedCharacter?.persona?.substring(0, 50),
          character_id: selectedCharacter?.id,
          scenario: scenario,
          session_id: sessionId,
          tts_enabled: ttsEnabled,
          tts_mode: ttsMode,
          api_url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/chat`,
        })
        console.log("⚠️ Ollama API 응답은 30-60초 정도 걸릴 수 있습니다. 기다려주세요...")
      }

      // 재시도 메커니즘 적용 (최대 3회, 지수 백오프)
      // 타임아웃 오류는 재시도하지 않음 (Ollama 응답이 느린 것이므로)
      const response = await retryWithBackoff(async () => {
        try {
          const result = await chatApi.chat({
            messages: [
              ...messages.map((msg) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
              })),
              {
                role: "user",
                content: currentInput,
              },
            ],
            persona: selectedCharacter?.persona || undefined,
            character_id: selectedCharacter?.id,
            scenario: {
              opponent: scenario.opponent,
              situation: scenario.situation,
              background: scenario.background,
            },
            session_id: sessionId,
            tts_enabled: ttsEnabled,
            tts_mode: ttsMode,
            tts_delay_ms: ttsDelayMs,
            tts_streaming_mode: ttsStreamingMode,
            temperature: 0.7,
            max_tokens: 512,
          })
          
          // 응답 검증
          if (!result) {
            throw new Error("응답이 없습니다.")
          }
          
          if (!result.success) {
            throw new Error(result.error?.message || "채팅 응답 실패")
          }
          
          if (!result.data || !result.data.content) {
            throw new Error("응답 데이터가 없거나 내용이 비어있습니다.")
          }
          
          return result
        } catch (error) {
          // 네트워크 오류는 재시도, 타임아웃은 재시도하지 않음
          if (error instanceof Error) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            const isTimeout = error.message.includes('시간이 초과') || error.message.includes('TIMEOUT_ERROR')
            
            if (isTimeout) {
              // 타임아웃은 재시도하지 않음 (Ollama 응답이 느린 것이므로)
              console.warn("채팅 API 타임아웃:", error.message)
              throw error
            }
            
            // 네트워크 오류는 재시도
            console.error("채팅 API 호출 오류:", error.message)
            console.error("API URL:", `${apiUrl}/api/chat`)
            console.error("백엔드 서버가 실행 중인지 확인하세요:", apiUrl)
          }
          throw error
        }
      }, 3, 1000) // 최대 3회 재시도, 초기 지연 1초

      // 성공 응답 처리
      if (response.success && response.data) {
        // Ollama API 응답에서 content 추출
        const responseContent = response.data.content
        
        if (!responseContent || typeof responseContent !== 'string') {
          console.error("응답 내용이 올바르지 않습니다:", response.data)
          throw new Error("응답 내용이 올바르지 않습니다.")
        }
        
        // 응답 내용이 비어있으면 경고
        if (!responseContent.trim()) {
          console.warn("응답 내용이 비어있습니다.")
        }
        
        // AI 메시지 생성 (줄바꿈 문자 처리)
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai" as const,
          content: responseContent.trim(),  // 앞뒤 공백 제거
          audio_url: response.data.audio_url,
          timestamp: new Date(),
        }
        
        // 개발 환경에서 로깅
        if (process.env.NODE_ENV === "development") {
          console.log("AI 응답 수신:", {
            content_length: aiMessage.content.length,
            content_preview: aiMessage.content.substring(0, 100),
            has_audio: !!aiMessage.audio_url,
          })
        }
        
        // 메시지 추가
        addMessage(aiMessage)
        incrementTurn()
        saveChatHistory()
        
        // TTS 재생 처리
        if (response.data.audio_url) {
          // audio_url이 상대 경로일 수 있으므로 절대 URL로 변환
          const audioUrl = response.data.audio_url.startsWith("http")
            ? response.data.audio_url
            : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${response.data.audio_url}`
          
          if (ttsMode === "realtime") {
            // 실시간: 즉시 재생
            setTimeout(() => {
              playAudio(audioUrl)
            }, 100)
          } else if (ttsMode === "delayed" && ttsDelayMs > 0) {
            // 지연: 설정된 시간 후 재생
            setTimeout(() => {
              playAudio(audioUrl)
            }, ttsDelayMs)
          }
          // on_click 모드는 메시지 클릭 시 재생 (아래 handleMessageClick에서 처리)
        }
      } else {
        // 응답 실패 처리
        const errorMessage = response.error?.message || "채팅 응답 실패"
        console.error("채팅 응답 실패:", {
          success: response.success,
          error: response.error,
          data: response.data,
        })
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("채팅 오류:", error)
      setRetryCount(prev => prev + 1)
      
      // 에러 타입 구분
      const isNetworkError = error instanceof Error && (
        error.message.includes('네트워크') ||
        error.message.includes('연결할 수 없습니다') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NETWORK_ERROR')
      )
      
      const isTimeoutError = error instanceof Error && (
        error.message.includes('시간이 초과') ||
        error.message.includes('TIMEOUT_ERROR')
      )
      
      // 네트워크 오류인 경우에만 백엔드 서버 상태 확인 (타임아웃은 제외)
      if (isNetworkError && !isTimeoutError) {
        // 백엔드 서버 상태 확인
        checkBackendHealth().then(health => {
          if (!health.isConnected) {
            console.error("백엔드 서버 연결 실패:", health.message)
          }
        })
      }
      
      // Toast로 에러 표시
      const errorMessage = error instanceof Error 
        ? error.message 
        : "채팅 요청 중 오류가 발생했습니다."
      
      // 에러 타입에 따라 다른 메시지 표시
      let toastTitle = "채팅 오류"
      let toastDescription = errorMessage
      
      if (isTimeoutError) {
        toastTitle = "응답 대기 시간 초과"
        toastDescription = "Ollama API 응답이 3분을 초과했습니다.\n\n응답이 느릴 수 있으니 잠시 후 다시 시도해주세요."
      } else if (isNetworkError) {
        toastTitle = "서버 연결 오류"
        toastDescription = errorMessage + "\n\n백엔드 서버가 실행 중인지 확인하세요."
      }
      
      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "destructive",
        duration: 7000, // 7초간 표시 (타임아웃 오류는 더 길게)
      })
      
      // 사용자 메시지는 이미 추가되었으므로, 에러 메시지 추가 (선택적)
      // addMessage({
      //   id: (Date.now() + 2).toString(),
      //   role: "ai",
      //   content: `죄송합니다. 오류가 발생했습니다: ${errorMessage}`,
      //   timestamp: new Date(),
      // })
    } finally {
      // 반드시 AI 타이핑 상태 해제 (에러 발생 시에도)
      setIsAiTyping(false)
    }
  }, [
    input,
    turnCount,
    maxTurns,
    sessionId,
    messages,
    selectedCharacter,
    scenario,
    ttsEnabled,
    ttsMode,
    ttsDelayMs,
    ttsStreamingMode,
    addMessage,
    incrementTurn,
    saveChatHistory,
    playAudio,
    retryWithBackoff,
    toast,
  ])
  
  // 메시지 클릭 시 오디오 재생 (on_click 모드)
  const handleMessageClick = useCallback((message: { id: string; audio_url?: string }) => {
    if (ttsMode === "on_click" && message.audio_url) {
      if (playingMessageId === message.id && isPlaying) {
        stopAudio()
        setPlayingMessageId(null)
      } else {
        stopAudio() // 다른 메시지 재생 중이면 중지
        // audio_url이 상대 경로일 수 있으므로 절대 URL로 변환
        const audioUrl = message.audio_url.startsWith("http")
          ? message.audio_url
          : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${message.audio_url}`
        playAudio(audioUrl)
        setPlayingMessageId(message.id)
      }
    }
  }, [ttsMode, playingMessageId, isPlaying, playAudio, stopAudio])

  const handleHintSelect = (hint: string) => {
    setInput(hint)
    setShowHints(false)
  }

  const handleContinue = () => {
    setShowEndModal(false)
  }

  const handleNewPlay = () => {
    setShowEndModal(false)
    saveChatHistory()
    resetGame()
  }

  const handleQuit = () => {
    setShowEndModal(false)
    saveChatHistory()
    goToHome()
  }

  const handleEndButton = () => {
    saveChatHistory()
    setShowEndModal(true)
  }

  if (!isVisible) return null

  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      {/* Header */}
      <header className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {scenario.opponent}
          </h1>
          <p className="text-xs text-muted-foreground">{scenario.situation}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-primary font-bold">{turnCount}</span>
            <span className="text-muted-foreground"> / {maxTurns} 턴</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTtsSettings(true)}
            className="border-border text-foreground bg-transparent"
            aria-label="TTS 설정"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndButton}
            className="border-border text-foreground bg-transparent"
          >
            종료
          </Button>
        </div>
      </header>

      {/* 3D Avatars - AI on left, User on right */}
      <div className="grid grid-cols-2 h-64 border-b border-border">
        <div className="relative border-r border-border bg-secondary/20">
          <Canvas camera={{ position: [0, 1, 2.5], fov: 50 }}>
            <Suspense fallback={null}>
              <AvatarScene isUser={false} />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-card/80 backdrop-blur-sm rounded text-xs text-foreground">
            AI ({scenario.opponent})
          </div>
        </div>
        <div className="relative bg-secondary/20">
          <Canvas camera={{ position: [0, 1, 2.5], fov: 50 }}>
            <Suspense fallback={null}>
              <AvatarScene isUser={true} />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-card/80 backdrop-blur-sm rounded text-xs text-foreground">
            {myName}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const hasAudio = !!msg.audio_url
          const isClickable = ttsMode === "on_click" && hasAudio
          const isCurrentlyPlaying = playingMessageId === msg.id && isPlaying
          
          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl relative group ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md"
                } ${
                  isClickable ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
                }`}
                onClick={() => handleMessageClick(msg)}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    handleMessageClick(msg)
                  }
                }}
                aria-label={isClickable ? "오디오 재생" : undefined}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                {hasAudio && (
                  <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
                    {isCurrentlyPlaying ? (
                      <Volume2 className="h-3 w-3 text-primary animate-pulse" />
                    ) : (
                      <Volume2 className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {isAiTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md">
              <div className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
                <p className="text-xs text-muted-foreground">
                  AI가 응답을 생성하는 중입니다... (최대 3분 소요될 수 있습니다)
                </p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hints Panel */}
      {showHints && (
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                추천 대사
              </span>
            </div>
            <button onClick={() => setShowHints(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2">
            {[
              "네, 알겠습니다. 바로 처리하겠습니다.",
              "죄송합니다, 다시 한번 설명해 주시겠어요?",
              "좋은 의견이네요. 저도 동의합니다.",
            ].map((hint, idx) => (
              <button
                key={idx}
                onClick={() => handleHintSelect(hint)}
                className="w-full text-left px-3 py-2 rounded-lg bg-secondary/50 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card space-y-3">
        <div className="flex justify-end">
          <button
            onClick={() => setShowHints(!showHints)}
            className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            힌트 보기
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="대사를 입력하세요..."
            disabled={turnCount >= maxTurns}
            className="flex-1 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || turnCount >= maxTurns}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {turnCount >= maxTurns - 5 && turnCount < maxTurns && (
          <p className="text-center text-xs text-destructive">
            {maxTurns - turnCount}턴 남았습니다!
          </p>
        )}
        
        {retryCount > 0 && (
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">
              재시도 중... ({retryCount}/3)
            </p>
          </div>
        )}
      </div>

      {/* End Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">The End</h2>
              <p className="text-muted-foreground">
                {turnCount >= maxTurns
                  ? `${maxTurns}턴이 종료되었습니다!`
                  : "연극을 종료하시겠습니까?"}
              </p>
            </div>

            <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 턴 수</span>
                <span className="text-foreground font-medium">{turnCount}턴</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">상황</span>
                <span className="text-foreground font-medium truncate max-w-[180px]">
                  {scenario.situation}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {turnCount < maxTurns && (
                <Button
                  onClick={handleContinue}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Play className="h-4 w-4 mr-2" />
                  계속하기
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleNewPlay}
                className="w-full border-border text-foreground bg-transparent"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                새 연극
              </Button>
              <Button
                variant="outline"
                onClick={handleQuit}
                className="w-full border-border text-foreground bg-transparent"
              >
                <Home className="h-4 w-4 mr-2" />
                그만하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TTS 설정 모달 */}
      <TtsSettingsModal
        open={showTtsSettings}
        onOpenChange={setShowTtsSettings}
      />
    </div>
  )
}
