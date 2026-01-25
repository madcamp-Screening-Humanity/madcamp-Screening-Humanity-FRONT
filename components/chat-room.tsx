"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/lib/store"
import {
  Send,
  Lightbulb,
  X,
  RotateCcw,
  Home,
  Play,
} from "lucide-react"

const aiResponses = [
  "그래서요? 더 설명해 주시겠어요?",
  "흠, 그건 좀 생각해 봐야겠는데요.",
  "정말요? 그건 처음 듣는 이야기네요.",
  "알겠습니다. 계속 말씀해 주세요.",
  "그 부분에 대해 더 이야기해 볼까요?",
]

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
  } = useAppStore()
  const [input, setInput] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const maxTurns = 30
  const isVisible = step === "chat"
  const myName = displayName || userName || "나"

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      setTimeout(() => {
        addMessage({
          id: Date.now().toString(),
          role: "ai",
          content: `안녕하세요. ${scenario.opponent}입니다. 무슨 일이시죠?`,
          timestamp: new Date(),
        })
        incrementTurn()
      }, 1000)
    }
  }, [isVisible])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (turnCount >= maxTurns && !showEndModal) {
      saveChatHistory()
      setShowEndModal(true)
    }
  }, [turnCount])

  const handleSend = () => {
    if (!input.trim() || turnCount >= maxTurns) return

    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    })
    incrementTurn()
    setInput("")

    setIsAiTyping(true)
    setTimeout(() => {
      const randomResponse =
        aiResponses[Math.floor(Math.random() * aiResponses.length)]
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: randomResponse,
        timestamp: new Date(),
      })
      incrementTurn()
      setIsAiTyping(false)
      saveChatHistory()
    }, 1500)
  }

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
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {isAiTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
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
      </div>

      {/* End Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">The End</h2>
              <p className="text-muted-foreground">
                {turnCount >= maxTurns
                  ? "30턴이 종료되었습니다!"
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
    </div>
  )
}
