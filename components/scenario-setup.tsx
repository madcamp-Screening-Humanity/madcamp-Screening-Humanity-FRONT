"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAppStore } from "@/lib/store"
import {
  ArrowLeft,
  ArrowRight,
  Info,
} from "lucide-react"

export function ScenarioSetup() {
  const { step, setStep, setScenario, selectedCharacter, setGeneratedScript } = useAppStore()
  const [opponent, setOpponent] = useState(selectedCharacter?.name || "")
  const [situation, setSituation] = useState("")

  const isVisible = step === "scenario-setup"

  // 캐릭터 선택 정보를 상태에 동기화
  useEffect(() => {
    if (isVisible && selectedCharacter) {
      setOpponent(selectedCharacter.name)
    }
  }, [isVisible, selectedCharacter])

  const handleContinue = () => {
    setScenario({
      opponent,
      situation,
    })
    setGeneratedScript("") // 새로운 분석을 위해 이전 스크립트 초기화
    setStep("script-preview")
  }

  const handleBack = () => {
    setStep("character-select")
  }

  const isValid = opponent.trim() && situation.trim()

  if (!isVisible) return null

  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      <header className="p-4 border-b border-border flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로
        </Button>
        <h1 className="text-lg font-semibold text-foreground">상황 설정</h1>
        <div className="w-20" />
      </header>

      <div className="flex-1 overflow-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="space-y-3">
            <Label htmlFor="opponent" className="text-foreground text-base">
              상대역 설정
            </Label>
            <Input
              id="opponent"
              placeholder="예: 코딩 안 하고 자는 팀원"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="situation" className="text-foreground text-base">
              상황 설정
            </Label>
            <Textarea
              id="situation"
              placeholder="예: 새벽 3시, 프로젝트 마감이 내일인데 팀원이 3시간째 잠만 자고 있다. 깨워서 남은 작업을 같이 하자고 설득해야 한다."
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={4}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                최대한 구체적으로 상황을 작성해야 AI가 더 상황 구성을 잘합니다.
                시간, 장소, 감정 상태, 목표 등을 포함하면 좋습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-border bg-card">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full py-6 text-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            시작하기
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
