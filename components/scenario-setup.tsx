"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useAppStore } from "@/lib/store"
import {
  ArrowLeft,
  ArrowRight,
  Info,
  User,
  Users,
} from "lucide-react"

export function ScenarioSetup() {
  const { step, setStep, setScenario, selectedCharacter, secondCharacter, gameMode, setGeneratedScript } = useAppStore()
  const [opponent, setOpponent] = useState(selectedCharacter?.name || "")
  const [situation, setSituation] = useState("")
  const [background, setBackground] = useState("")

  const isVisible = step === "scenario-setup"
  const isDirectorMode = gameMode === "director"

  // 캐릭터 선택 정보를 상태에 동기화
  useEffect(() => {
    if (isVisible && selectedCharacter && !isDirectorMode) {
      // 주연 모드일 때만 opponent 설정
      setOpponent(selectedCharacter.name)
    }
  }, [isVisible, selectedCharacter, isDirectorMode])

  const handleContinue = () => {
    // 감독 모드일 때는 두 캐릭터 이름을 조합해서 opponent에 저장
    const finalOpponent = isDirectorMode && selectedCharacter && secondCharacter
      ? `${selectedCharacter.name} & ${secondCharacter.name}`
      : opponent
    
    setScenario({
      opponent: finalOpponent,
      situation,
      ...(background.trim() ? { background: background.trim() } : {}),
    })
    setGeneratedScript("") // 새로운 분석을 위해 이전 스크립트 초기화
    setStep("script-preview")
  }

  const handleBack = () => {
    setStep("character-select")
  }

  // 감독 모드: 두 캐릭터가 모두 선택되어야 하고, 상황도 입력되어야 함
  // 주연 모드: opponent와 situation이 모두 입력되어야 함
  const isValid = isDirectorMode
    ? selectedCharacter && secondCharacter && situation.trim()
    : opponent.trim() && situation.trim()

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
          {/* 감독 모드: 선택된 배우들 섹션 */}
          {isDirectorMode ? (
            <div className="space-y-3">
              <Label className="text-foreground text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                선택된 배우들
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {selectedCharacter && (
                  <Card className="p-4 bg-secondary/50 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {selectedCharacter.name}
                        </p>
                        {selectedCharacter.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {selectedCharacter.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
                {secondCharacter && (
                  <Card className="p-4 bg-secondary/50 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {secondCharacter.name}
                        </p>
                        {secondCharacter.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {secondCharacter.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
              {(!selectedCharacter || !secondCharacter) && (
                <p className="text-sm text-muted-foreground">
                  두 명의 캐릭터를 모두 선택해주세요.
                </p>
              )}
            </div>
          ) : (
            /* 주연 모드: 상대역 설정 */
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
          )}

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

          <div className="space-y-3">
            <Label htmlFor="background" className="text-foreground text-base">
              배경 (선택)
            </Label>
            <Textarea
              id="background"
              placeholder="예: 어두운 마법탑 안, 촛불만 겨우 비추는 서고. 먼지와 고서 냄새."
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={2}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground">
              장소·분위기 등 추가 맥락을 넣으면 대사 톤에 반영됩니다.
            </p>
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
