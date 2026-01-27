"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Zap, Infinity, Bot } from "lucide-react"

type LlmModel = "gemini-3-flash-preview" | "gemini-2.5-flash" | "glm-4.7-flash"

interface LlmSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (model: LlmModel) => void
}

export function LlmSelectModal({ open, onOpenChange, onSelect }: LlmSelectModalProps) {
  const [selectedModel, setSelectedModel] = useState<LlmModel>("gemini-3-flash-preview")

  const handleConfirm = () => {
    onSelect(selectedModel)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">AI 모델 선택</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            대화를 진행할 AI 모델을 선택해주세요. 모델에 따라 대화 턴 수가 제한될 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup 
            value={selectedModel} 
            onValueChange={(v) => setSelectedModel(v as LlmModel)}
            className="space-y-3"
          >
            {/* Gemini 3 Flash Preview */}
            <Label
              htmlFor="gemini-3"
              className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-secondary/30 ${
                selectedModel === "gemini-3-flash-preview" ? "border-primary bg-secondary/50" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="gemini-3-flash-preview" id="gemini-3" className="mt-1" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Gemini 3.0 Flash Preview</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500">NEW</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    가장 빠르고 효율적인 최신 모델.
                  </p>
                  <p className="text-xs font-medium text-amber-500 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    대화 20턴 제한 (토큰 절약)
                  </p>
                </div>
              </div>
            </Label>

            {/* Gemini 2.5 Flash */}
            <Label
              htmlFor="gemini-2.5"
              className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-secondary/30 ${
                selectedModel === "gemini-2.5-flash" ? "border-primary bg-secondary/50" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="gemini-2.5-flash" id="gemini-2.5" className="mt-1" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Gemini 2.5 Flash</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    안정적이고 빠른 응답 속도.
                  </p>
                  <p className="text-xs font-medium text-amber-500 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    대화 20턴 제한 (토큰 절약)
                  </p>
                </div>
              </div>
            </Label>

            {/* GLM-4.7-Flash (31B) */}
            <Label
              htmlFor="glm-4"
              className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-secondary/30 ${
                selectedModel === "glm-4.7-flash" ? "border-primary bg-secondary/50" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="glm-4.7-flash" id="glm-4" className="mt-1" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">GLM-4.7-Flash (31B)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500">LOCAL</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    로컬 서버에서 구동되는 고성능 모델 (31B).
                  </p>
                  <p className="text-xs font-medium text-blue-500 flex items-center gap-1">
                    <Infinity className="h-3 w-3" />
                    무제한 대화 가능
                  </p>
                </div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                취소
            </Button>
            <Button onClick={handleConfirm} className="flex-1 bg-primary text-primary-foreground">
                선택 완료
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
