"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { Loader2, Sparkles, Brain, Wand2 } from "lucide-react"

const loadingSteps = [
  { icon: Brain, text: "시나리오 분석 중..." },
  { icon: Wand2, text: "캐릭터 생성 중..." },
  { icon: Sparkles, text: "무대 준비 중..." },
]

export function LoadingScreen() {
  const { step, setStep, scenario } = useAppStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const isVisible = step === "loading"

  useEffect(() => {
    if (isVisible) {
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= loadingSteps.length - 1) {
            clearInterval(stepInterval)
            return prev
          }
          return prev + 1
        })
      }, 1500)

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setTimeout(() => setStep("chat"), 500)
            return 100
          }
          return prev + 2
        })
      }, 100)

      return () => {
        clearInterval(stepInterval)
        clearInterval(progressInterval)
      }
    }
  }, [isVisible, setStep])

  if (!isVisible) return null

  const CurrentIcon = loadingSteps[currentStep].icon

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4" suppressHydrationWarning>
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <CurrentIcon className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {loadingSteps[currentStep].text}
          </h2>
          <p className="text-muted-foreground">
            Director AI가 연극을 준비하고 있습니다
          </p>
        </div>

        <div className="space-y-4">
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-4 bg-card rounded-xl border border-border text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              시나리오 요약
            </p>
            <p className="text-sm text-foreground">
              <span className="text-primary font-medium">{scenario.opponent}</span>
              {" "}상대로{" "}
              <span className="text-primary font-medium">{scenario.mission}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {loadingSteps.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
