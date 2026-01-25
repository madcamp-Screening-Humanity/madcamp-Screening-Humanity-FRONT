"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store"
import { User, Users, Sparkles } from "lucide-react"

export function ModeSelectModal() {
  const { step, setStep, setGameMode, goToHome } = useAppStore()
  const isOpen = step === "mode-select"

  const handleSelectMode = (mode: "actor" | "director") => {
    setGameMode(mode)
    if (mode === "actor") {
      setStep("avatar-upload")
    } else {
      setStep("scenario-setup")
    }
  }

  const handleClose = () => {
    // X 버튼 클릭 시 랜딩 페이지로 이동
    goToHome()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose()
      }
    }}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            모드 선택
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            어떤 방식으로 연극에 참여하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-6">
          <button
            onClick={() => handleSelectMode("actor")}
            className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border bg-secondary/50 hover:border-primary hover:bg-secondary transition-all"
          >
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                주연 배우 모드
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                내가 직접 AI와 1:1 롤플레이
              </p>
            </div>
            <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
              추천
            </span>
          </button>

          <button
            onClick={() => handleSelectMode("director")}
            className="group flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border bg-secondary/50 hover:border-primary hover:bg-secondary transition-all"
          >
            <div className="p-4 rounded-full bg-muted group-hover:bg-muted/80 transition-colors">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                감독 모드
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI vs AI 연극 관전 (자동 진행)
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
