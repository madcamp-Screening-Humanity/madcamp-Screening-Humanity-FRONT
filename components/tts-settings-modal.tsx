"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useAppStore } from "@/lib/store"
import { Settings, Volume2, Clock, MousePointerClick } from "lucide-react"

export function TtsSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    ttsMode,
    setTtsMode,
    ttsDelayMs,
    setTtsDelayMs,
    ttsStreamingMode,
    setTtsStreamingMode,
    ttsEnabled,
    setTtsEnabled,
  } = useAppStore()

  const [localTtsMode, setLocalTtsMode] = useState<"realtime" | "delayed" | "on_click">(ttsMode)
  const [localTtsDelayMs, setLocalTtsDelayMs] = useState(ttsDelayMs)
  const [localTtsStreamingMode, setLocalTtsStreamingMode] = useState(ttsStreamingMode)
  const [localTtsEnabled, setLocalTtsEnabled] = useState(ttsEnabled)

  const handleSave = () => {
    setTtsMode(localTtsMode)
    setTtsDelayMs(localTtsDelayMs)
    setTtsStreamingMode(localTtsStreamingMode)
    setTtsEnabled(localTtsEnabled)
    onOpenChange(false)
  }

  const handleCancel = () => {
    // 로컬 상태를 원래 값으로 복원
    setLocalTtsMode(ttsMode)
    setLocalTtsDelayMs(ttsDelayMs)
    setLocalTtsStreamingMode(ttsStreamingMode)
    setLocalTtsEnabled(ttsEnabled)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            TTS 설정
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            음성 합성(TTS) 옵션을 설정하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TTS 활성화/비활성화 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tts-enabled" className="text-foreground">
                TTS 활성화
              </Label>
              <p className="text-sm text-muted-foreground">
                음성 합성 기능을 켜거나 끕니다
              </p>
            </div>
            <Switch
              id="tts-enabled"
              checked={localTtsEnabled}
              onCheckedChange={setLocalTtsEnabled}
            />
          </div>

          {localTtsEnabled && (
            <>
              {/* TTS 호출 방식 */}
              <div className="space-y-3">
                <Label className="text-foreground">호출 방식</Label>
                <RadioGroup
                  value={localTtsMode}
                  onValueChange={(value) =>
                    setLocalTtsMode(value as "realtime" | "delayed" | "on_click")
                  }
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="realtime" id="realtime" />
                    <Label
                      htmlFor="realtime"
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <Volume2 className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">실시간</div>
                        <div className="text-xs text-muted-foreground">
                          채팅 응답과 동시에 음성 재생
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="delayed" id="delayed" />
                    <Label
                      htmlFor="delayed"
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">지연</div>
                        <div className="text-xs text-muted-foreground">
                          설정한 시간 후 음성 재생
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="on_click" id="on_click" />
                    <Label
                      htmlFor="on_click"
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <MousePointerClick className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">클릭</div>
                        <div className="text-xs text-muted-foreground">
                          메시지 클릭 시 음성 재생
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 지연 시간 설정 (delayed 모드일 때만) */}
              {localTtsMode === "delayed" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">지연 시간</Label>
                    <span className="text-sm text-muted-foreground">
                      {localTtsDelayMs}ms
                    </span>
                  </div>
                  <Slider
                    value={[localTtsDelayMs]}
                    onValueChange={([value]) => setLocalTtsDelayMs(value)}
                    min={0}
                    max={5000}
                    step={100}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    0ms (즉시) ~ 5000ms (5초)
                  </p>
                </div>
              )}

              {/* Streaming Mode 설정 */}
              <div className="space-y-3">
                <Label className="text-foreground">품질/속도 설정</Label>
                <RadioGroup
                  value={localTtsStreamingMode.toString()}
                  onValueChange={(value) => setLocalTtsStreamingMode(parseInt(value, 10))}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="0" id="mode-0" />
                    <Label htmlFor="mode-0" className="flex-1 cursor-pointer">
                      <div className="font-medium text-foreground">모드 0: 비활성화</div>
                      <div className="text-xs text-muted-foreground">
                        전체 생성 후 반환 (가장 느림, 최고 품질)
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="1" id="mode-1" />
                    <Label htmlFor="mode-1" className="flex-1 cursor-pointer">
                      <div className="font-medium text-foreground">모드 1: 고품질 스트리밍</div>
                      <div className="text-xs text-muted-foreground">
                        느림, 고품질
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="2" id="mode-2" />
                    <Label htmlFor="mode-2" className="flex-1 cursor-pointer">
                      <div className="font-medium text-foreground">모드 2: 중간 품질 스트리밍</div>
                      <div className="text-xs text-muted-foreground">
                        보통 속도, 중간 품질
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="3" id="mode-3" />
                    <Label htmlFor="mode-3" className="flex-1 cursor-pointer">
                      <div className="font-medium text-foreground">모드 3: 저품질 스트리밍</div>
                      <div className="text-xs text-muted-foreground">
                        매우 빠름, 저품질
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-border text-foreground bg-transparent"
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
