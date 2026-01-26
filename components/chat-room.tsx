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
    ttsMode,
    ttsDelayMs,
    ttsStreamingMode,
    ttsEnabled,
    sessionId,
    setSessionId,
    maxTurns,
    generatedScript,
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

  useEffect(() => {
    if (isVisible && !sessionId) {
      const newSessionId = crypto.randomUUID()
      setSessionId(newSessionId)
    }
  }, [isVisible, sessionId, setSessionId])

  useEffect(() => {
    if (isVisible && messages.length === 0 && selectedCharacter && sessionId) {
      if (selectedCharacter.sample_dialogue) {
        addMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: selectedCharacter.sample_dialogue,
          timestamp: new Date(),
        })
        incrementTurn()
        return
      }

      const generateInitialMessage = async () => {
        try {
          const response = await chatApi.chat({
            messages: [],
            persona: `${buildSystemPersona(selectedCharacter)}\n\n이제 아래 답변을 받은 ${selectedCharacter.name} 처럼 답변하십시오.`,
            character_id: selectedCharacter.id,
            scenario: {
              opponent: scenario.opponent,
              situation: generatedScript || scenario.situation,
            },
            session_id: sessionId,
            tts_enabled: ttsEnabled,
            tts_mode: ttsMode,
            tts_delay_ms: ttsDelayMs,
            tts_streaming_mode: ttsStreamingMode,
            temperature: 0.7,
            max_tokens: 512,
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
            }
          } else {
            throw new Error(response?.error?.message || "초기 메시지 생성 실패")
          }
        } catch (error) {
          console.error("초기 메시지 생성 오류:", error)
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: `안녕하세요. ${scenario.opponent}입니다. 무슨 일이시죠?`,
            timestamp: new Date(),
          })
          incrementTurn()
        }
      }

      generateInitialMessage()
    }
  }, [isVisible, selectedCharacter, sessionId, scenario, ttsEnabled, ttsMode, ttsDelayMs, ttsStreamingMode, addMessage, incrementTurn, playAudio, generatedScript])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    setIsAiTyping(true)

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
          persona: selectedCharacter 
            ? `${buildSystemPersona(selectedCharacter)}\n\n이제 아래 답변을 받은 ${selectedCharacter.name} 처럼 답변하십시오.` 
            : undefined,
          character_id: selectedCharacter?.id,
          scenario: {
            opponent: scenario.opponent,
            situation: generatedScript || scenario.situation,
          },
          session_id: sessionId,
          tts_enabled: ttsEnabled,
          tts_mode: ttsMode,
          tts_delay_ms: ttsDelayMs,
          tts_streaming_mode: ttsStreamingMode,
          temperature: 0.7,
          max_tokens: 512,
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
  }, [input, turnCount, maxTurns, sessionId, messages, selectedCharacter, scenario, ttsEnabled, ttsMode, ttsDelayMs, ttsStreamingMode, addMessage, incrementTurn, saveChatHistory, playAudio, retryWithBackoff, toast, generatedScript])

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

  const handleContinue = () => setShowEndModal(false)
  const handleNewPlay = () => { setShowEndModal(false); saveChatHistory(); resetGame(); }
  const handleQuit = () => { setShowEndModal(false); saveChatHistory(); goToHome(); }
  const handleEndButton = () => { saveChatHistory(); setShowEndModal(true); }

  if (!isVisible) return null

  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      <header className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{scenario.opponent}</h1>
          <p className="text-xs text-muted-foreground line-clamp-1">{scenario.situation}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-primary font-bold">{turnCount}</span>
            <span className="text-muted-foreground"> / {maxTurns} 턴</span>
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
            AI ({scenario.opponent})
          </div>
        </div>
        <div className="relative bg-secondary/20">
          <Canvas camera={{ position: [0, 1, 2.5], fov: 50 }}>
            <Suspense fallback={null}><AvatarScene isUser={true} /></Suspense>
          </Canvas>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-card/80 backdrop-blur-sm rounded text-xs">{myName}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl relative group ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md text-foreground"
                } ${ttsMode === "on_click" && msg.audio_url ? "cursor-pointer" : ""}`}
              onClick={() => handleMessageClick(msg)}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              {msg.audio_url && (
                <div className="absolute -bottom-1 -right-1">
                  <Volume2 className={`h-3 w-3 ${playingMessageId === msg.id && isPlaying ? "text-primary animate-pulse" : "text-muted-foreground opacity-50"}`} />
                </div>
              )}
            </div>
          </div>
        ))}
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
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="대사를 입력하세요..." disabled={turnCount >= maxTurns} className="flex-1 bg-secondary/50" />
          <Button onClick={handleSend} disabled={!input.trim() || turnCount >= maxTurns} className="bg-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      {showEndModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-6">
            <h2 className="text-2xl font-bold text-center">The End</h2>
            <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">총 턴 수</span><span>{turnCount}턴</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">상황</span><span className="truncate max-w-[180px]">{scenario.situation}</span></div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleQuit}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                연극 종료하기
              </Button>
            </div>
          </div>
        </div>
      )}
      {showTtsSettings && <TtsSettingsModal open={showTtsSettings} onOpenChange={setShowTtsSettings} />}
    </div>
  )
}
