"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAppStore } from "@/lib/store"
import {
  ArrowLeft,
  Building2,
  School,
  Hospital,
  Coffee,
  Tent,
  ArrowRight,
  Info,
} from "lucide-react"

const backgrounds = [
  { id: "school", name: "학교", icon: School },
  { id: "office", name: "회사", icon: Building2 },
  { id: "molcamp", name: "몰입캠프", icon: Tent },
  { id: "hospital", name: "병원", icon: Hospital },
  { id: "cafe", name: "카페", icon: Coffee },
]

export function ScenarioSetup() {
  const { step, setStep, setScenario, gameMode } = useAppStore()
  const [selectedBg, setSelectedBg] = useState("")
  const [opponent, setOpponent] = useState("")
  const [situation, setSituation] = useState("")

  const isVisible = step === "scenario-setup"

  const handleContinue = () => {
    setScenario({
      background: selectedBg,
      opponent,
      situation,
    })
    setStep("script-preview")
  }

  const handleBack = () => {
    if (gameMode === "actor") {
      setStep("avatar-upload")
    } else {
      setStep("mode-select")
    }
  }

  const isValid = selectedBg && opponent.trim() && situation.trim()

  if (!isVisible) return null

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
          <div className="space-y-4">
            <Label className="text-foreground text-base">배경 선택</Label>
            <div className="grid grid-cols-5 gap-3">
              {backgrounds.map((bg) => {
                const Icon = bg.icon
                return (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBg(bg.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedBg === bg.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        selectedBg === bg.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        selectedBg === bg.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {bg.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

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
