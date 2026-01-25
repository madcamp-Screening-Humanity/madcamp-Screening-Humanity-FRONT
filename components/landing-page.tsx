"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Theater, Sparkles, User, Trash2, Clock, MapPin, LogOut } from "lucide-react"

export function LandingPage() {
  const {
    step,
    setStep,
    setIsLoggedIn,
    setUserName,
    isLoggedIn,
    userName,
    chatHistories,
    loadChatHistory,
    deleteChatHistory,
    goToHome,
  } = useAppStore()
  const [showHistory, setShowHistory] = useState(false)
  const router = useRouter()
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleGoogleLogin = () => {
    // Backend OAuth URL로 직접 이동
    window.location.href = `${API_BASE_URL}/api/auth/google/login`
  }

  const handleLogout = async () => {
    try {
      // Backend 로그아웃 엔드포인트 호출
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok || response.redirected) {
        // Zustand store 초기화
        setIsLoggedIn(false)
        setUserName("")
        goToHome()
        
        // 랜딩 페이지로 리다이렉트 (이미 랜딩 페이지이지만 상태 초기화를 위해)
        router.push("/")
      }
    } catch (error) {
      console.error("Logout error:", error)
      // 에러가 발생해도 로컬 상태는 초기화
      setIsLoggedIn(false)
      setUserName("")
      goToHome()
      router.push("/")
    }
  }

  const handleContinueChat = (id: string) => {
    loadChatHistory(id)
  }

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChatHistory(id)
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const backgroundNames: Record<string, string> = {
    school: "학교",
    office: "회사",
    molcamp: "몰입캠프",
    hospital: "병원",
    cafe: "카페",
  }

  if (step !== "landing") return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative">
      {/* User Info and Logout Button */}
      {isLoggedIn && (
        <div className="absolute top-6 right-6 flex items-center gap-3">
          {/* Profile Button (채팅 기록이 있을 때만 표시) */}
          {chatHistories.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-3 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
              title="내 기록"
            >
              <User className="h-5 w-5 text-foreground" />
            </button>
          )}
          
          {/* User Info and Logout */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
            {userName && (
              <span className="text-sm text-foreground font-medium">
                {userName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="absolute top-20 right-6 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">내 연극 기록</h3>
            <p className="text-xs text-muted-foreground mt-1">이어서 대화하거나 기록을 확인하세요</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {chatHistories.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                아직 기록이 없습니다
              </div>
            ) : (
              chatHistories.map((history) => (
                <div
                  key={history.id}
                  onClick={() => handleContinueChat(history.id)}
                  className="p-4 border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {history.scenario.opponent}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{backgroundNames[history.scenario.background] || history.scenario.background}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {history.scenario.situation}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{history.turnCount}턴</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(history.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistory(history.id, e)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="text-center space-y-8 max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Theater className="h-16 w-16 text-primary" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
          인생 극장
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
          AI와 함께하는 몰입형 롤플레이 학습 플랫폼
        </p>

        <div className="flex flex-col gap-4 items-center pt-8">
          {isLoggedIn ? (
            <Button
              size="lg"
              onClick={() => setStep("mode-select")}
              className="px-8 py-6 text-lg font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              새 연극 시작하기
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleGoogleLogin}
              className="px-8 py-6 text-lg font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 계속하기
            </Button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI 기반 상황극 연습으로 소통 능력 향상</span>
        </div>
      </div>

      <footer className="absolute bottom-8 text-sm text-muted-foreground">
        Powered by OpenAI
      </footer>
    </div>
  )
}
