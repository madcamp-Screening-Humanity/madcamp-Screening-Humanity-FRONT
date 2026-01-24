"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/lib/store"
import { Textarea } from "@/components/ui/textarea"
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
  } = useAppStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState("")
  const [customName, setCustomName] = useState(displayName || "")
  const [showNameInput, setShowNameInput] = useState(false)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [editedScript, setEditedScript] = useState("")

  const isVisible = step === "script-preview"

  const backgroundNames: Record<string, string> = {
    school: "학교",
    office: "회사",
    molcamp: "몰입캠프",
    hospital: "병원",
    cafe: "카페",
  }

  useEffect(() => {
    if (isVisible && !generatedScript) {
      generateScript()
    } else if (isVisible && generatedScript) {
      setScript(generatedScript)
    }
  }, [isVisible])

  const generateScript = async () => {
    setIsGenerating(true)
    
    // Simulate AI generating script
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const bgName = backgroundNames[scenario.background] || scenario.background
    const finalName = customName || displayName || userName || "주인공"
    
    const generatedText = `[ 상황 설명 ]

장소: ${bgName}
등장인물: ${finalName} (나), ${scenario.opponent}

---

${scenario.situation}

---

[ 연극 시작 ]

${scenario.opponent}의 역할을 맡은 AI가 먼저 말을 걸 것입니다.
${finalName}(으)로서 자연스럽게 대화를 이어가세요.

목표: 주어진 상황에서 원하는 결과를 이끌어내세요.
제한: 30턴 이내에 대화를 마무리해야 합니다.

행운을 빕니다!`

    setScript(generatedText)
    setGeneratedScript(generatedText)
    setIsGenerating(false)
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
                <p className="text-muted-foreground text-sm">상황을 분석하고 있습니다...</p>
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
