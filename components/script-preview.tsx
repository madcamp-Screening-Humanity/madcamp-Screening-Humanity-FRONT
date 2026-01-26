"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/lib/store"
import { Textarea } from "@/components/ui/textarea"
import { storyApi } from "@/lib/api/client"
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  User,
  Loader2,
  Edit3,
  Check,
} from "lucide-react"

export function ScriptPreview() {
  const {
    step,
    setStep,
    scenario,
    userName,
    displayName,
    setDisplayName,
    setGeneratedScript,
    generatedScript,
    selectedCharacter,
    secondCharacter,
    gameMode,
  } = useAppStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState("")
  const [customName, setCustomName] = useState(displayName || "")
  const [showNameInput, setShowNameInput] = useState(false)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [editedScript, setEditedScript] = useState("")

  const isVisible = step === "script-preview"

  useEffect(() => {
    if (isVisible && !generatedScript) {
      generateScript()
    } else if (isVisible && generatedScript) {
      setScript(generatedScript)
    }
  }, [isVisible])

  const generateScript = async () => {
    // 기본 데이터 검증
    const currentSituation = scenario.situation || "상황이 입력되지 않았습니다."
    const finalName = customName || displayName || userName || "주인공"
    const isDirectorMode = gameMode === "director"

    setIsGenerating(true)

    try {
      let response
      
      if (isDirectorMode && selectedCharacter && secondCharacter) {
        // 감독 모드: 2명의 캐릭터 정보 전송
        response = await storyApi.analyzeSituation({
          mode: "director",
          situation: currentSituation,
          character1_name: selectedCharacter.name,
          character1_persona: selectedCharacter.persona || "",
          character2_name: secondCharacter.name,
          character2_persona: secondCharacter.persona || "",
        })
      } else {
        // 주연 모드: 상대역 정보 전송
        const opponentName = scenario.opponent || selectedCharacter?.name || "상대역"
        response = await storyApi.analyzeSituation({
          mode: "actor",
          situation: currentSituation,
          opponent_name: opponentName,
          character_persona: selectedCharacter?.persona || ""
        })
      }

      if (response.success && response.data) {
        // plot 필드 우선 사용, 없으면 story 필드 확인 (하위 호환)
        const plot = (response.data as any).plot || (response.data as any).story || currentSituation

        let generatedText: string
        
        if (isDirectorMode && selectedCharacter && secondCharacter) {
          // 감독 모드: 두 캐릭터가 대화
          generatedText = `[ 상황 설명 ]

등장인물: ${selectedCharacter.name}, ${secondCharacter.name}

---

${plot}

---

[ 연극 시작 ]

${selectedCharacter.name}과(와) ${secondCharacter.name}의 역할을 맡은 AI들이 자동으로 대화를 시작합니다.
감독으로서 대화의 흐름을 관전하세요.

목표: 주어진 상황에서 두 캐릭터가 자연스럽게 대화를 이어가도록 합니다.
제한: 30턴 이내에 대화를 마무리해야 합니다.

행운을 빕니다!`
        } else {
          // 주연 모드: 사용자가 직접 참여
          const opponentName = scenario.opponent || selectedCharacter?.name || "상대역"
          generatedText = `[ 상황 설명 ]

등장인물: ${finalName} (나), ${opponentName}

---

${plot}

---

[ 연극 시작 ]

${opponentName}의 역할을 맡은 AI가 먼저 말을 걸 것입니다.
${finalName}(으)로서 자연스럽게 대화를 이어가세요.

목표: 주어진 상황에서 원하는 결과를 이끌어내세요.
제한: 30턴 이내에 대화를 마무리해야 합니다.

행운을 빕니다!`
        }

        setScript(generatedText)
        setGeneratedScript(generatedText)
      } else {
        const errorMsg = response.error?.message || "상황을 분석하는 도중 알 수 없는 오류가 발생했습니다."
        setScript(`[ 분석 실패 ]\n\nAI의 일시적인 혼선으로 분석에 실패했습니다.\n\n[ 입력하신 상황 ]\n${currentSituation}\n\n위 상황으로 바로 대화를 시작하실 수 있습니다.`)
      }
    } catch (error) {
      console.error("Script generation error:", error)
      setScript(`[ 서버 연결 오류 ]\n\n백엔드 서버와 통신할 수 없습니다.\n\n[ 입력하신 상황 ]\n${currentSituation}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleContinue = () => {
    if (customName) {
      setDisplayName(customName)
    } else if (!displayName) {
      setDisplayName(userName)
    }
    setStep("loading")
  }

  const handleBack = () => {
    setStep("scenario-setup")
  }

  const handleNameSave = () => {
    setDisplayName(customName || userName)
    setShowNameInput(false)
    // Regenerate script with new name
    generateScript()
  }

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
        <h1 className="text-lg font-semibold text-foreground">상황 스크립트</h1>
        <div className="w-20" />
      </header>

      <div className="flex-1 overflow-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Name Registration */}
          <div className="p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">내 이름</span>
              </div>
              {!showNameInput && (
                <button
                  onClick={() => setShowNameInput(true)}
                  className="text-xs text-primary hover:underline"
                >
                  변경하기
                </button>
              )}
            </div>

            {showNameInput ? (
              <div className="space-y-3">
                <Input
                  placeholder={userName || "이름 입력"}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleNameSave}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNameInput(false)
                      setCustomName(displayName || "")
                    }}
                    className="flex-1 border-border text-foreground bg-transparent"
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-foreground">
                {displayName || customName || userName || "Guest User"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              이름을 등록하지 않으면 Google 계정 이름이 사용됩니다.
            </p>
          </div>

          {/* Script Display */}
          <div className="p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">AI가 분석한 상황</span>
              </div>
              {!isGenerating && !isEditingScript && (
                <button
                  onClick={() => {
                    setIsEditingScript(true)
                    setEditedScript(script)
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Edit3 className="h-3 w-3" />
                  수정하기
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-foreground font-medium">시나리오 생성 중...</p>
                  <p className="text-muted-foreground text-xs">잠시만 기다려주세요. AI가 상황을 분석하고 있습니다.</p>
                </div>
              </div>
            ) : isEditingScript ? (
              <div className="space-y-3">
                <Textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="min-h-[300px] bg-secondary/30 border-border text-foreground font-mono text-sm leading-relaxed"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setScript(editedScript)
                      setGeneratedScript(editedScript)
                      setIsEditingScript(false)
                    }}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingScript(false)
                      setEditedScript("")
                    }}
                    className="flex-1 border-border text-foreground bg-transparent"
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {script}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-border bg-card">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleContinue}
            disabled={isGenerating}
            className="w-full py-6 text-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            대화 시작하기
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
