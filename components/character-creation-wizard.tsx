"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Volume2, Play, Pause } from "lucide-react"
import { characterApi } from "@/lib/api/client"
import { ttsApi } from "@/lib/api/client"
import { useToast } from "@/hooks/use-toast"
import { parsePersona } from "@/lib/utils/persona-parser"
import { CHARACTER_PREVIEW } from "@/lib/config/character"
import type { Character, CreateCharacterRequest } from "@/lib/api/types"
import type { Voice } from "@/lib/api/types"

interface CharacterCreationWizardProps {
  onComplete: (character: Character) => void
  onCancel: () => void
  initialData?: Character | null
}

export function CharacterCreationWizard({
  onComplete,
  onCancel,
  initialData,
}: CharacterCreationWizardProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // Step 1: 기본 정보 입력
  const [characterName, setCharacterName] = useState(initialData?.name || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<Partial<Character> | null>(initialData || null)

  // Step 2: Persona 상세 입력
  const [persona, setPersona] = useState(initialData?.persona || "")
  const [personality, setPersonality] = useState("")
  const [speechStyle, setSpeechStyle] = useState("")
  const [background, setBackground] = useState("")
  const [goals, setGoals] = useState("")

  // Persona 파싱 (초기 데이터가 있을 경우)
  useEffect(() => {
    if (initialData?.persona) {
      const parsed = parsePersona(initialData.persona)
      setPersonality(parsed.personality)
      setSpeechStyle(parsed.speechStyle)
      setBackground(parsed.background)
      setGoals(parsed.goals)
    }
    if (initialData?.voice_id) {
      setSelectedVoiceId(initialData.voice_id)
    }
  }, [initialData])

  // Step 3: Voice 선택
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("")
  const [loadingVoices, setLoadingVoices] = useState(false)

  // Step 4: 미리보기
  const [previewText, setPreviewText] = useState(CHARACTER_PREVIEW.DEFAULT_TEXT)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // 음성 목록 로드
  useEffect(() => {
    if (currentStep === 3) {
      loadVoices()
    }
  }, [currentStep])

  const loadVoices = useCallback(async () => {
    setLoadingVoices(true)
    try {
      const response = await ttsApi.listVoices()
      if (response.success && response.data) {
        setVoices(response.data.voices || [])
        if (response.data.voices && response.data.voices.length > 0) {
          setSelectedVoiceId(response.data.voices[0].id)
        }
      }
    } catch (error) {
      console.error("음성 목록 로드 실패:", error)
    } finally {
      setLoadingVoices(false)
    }
  }, [])

  // 다음 단계로 이동 (Step 1에서는 AI 생성 포함)
  const handleNext = async () => {
    if (currentStep === 1) {
      setIsGenerating(true)
      try {
        const response = await characterApi.generateCharacterDetails({
          name: characterName,
          category,
          description
        })

        if (response.success && response.data) {
          const generated = response.data
          setGeneratedData(generated)
          setPersona(generated.persona || "")

          if (generated.persona) {
            const parsed = parsePersona(generated.persona)
            setPersonality(parsed.personality)
            setSpeechStyle(parsed.speechStyle)
            setBackground(parsed.background)
            setGoals(parsed.goals)
          }

          toast({
            title: "생성 완료",
            description: "인공지능이 캐릭터의 페르소나를 구성했습니다.",
          })
          setCurrentStep(2)
        } else {
          throw new Error(response.error?.message || "AI 생성 실패")
        }
      } catch (error) {
        console.error("AI 생성 실패:", error)
        toast({
          title: "생성 실패",
          description: error instanceof Error ? error.message : "캐릭터 생성 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsGenerating(false)
      }
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  // 이전 단계로 이동
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      onCancel()
    }
  }

  // Step 1 검증
  const isStep1Valid = () => {
    return characterName.trim().length > 0
  }

  // Step 2 검증
  const isStep2Valid = () => {
    return persona.trim().length > 0 || (personality.trim().length > 0 && speechStyle.trim().length > 0)
  }

  // Step 3 검증
  const isStep3Valid = () => {
    return selectedVoiceId.length > 0
  }

  // Persona 통합
  const buildPersona = useCallback(() => {
    if (persona.trim()) {
      return persona
    }
    const parts: string[] = []
    if (personality.trim()) parts.push(`성격: ${personality}`)
    if (speechStyle.trim()) parts.push(`말투: ${speechStyle}`)
    if (background.trim()) parts.push(`배경: ${background}`)
    if (goals.trim()) parts.push(`목표: ${goals}`)
    return parts.join("\n")
  }, [persona, personality, speechStyle, background, goals])

  // 음성 미리보기 생성
  const generateVoicePreview = useCallback(async () => {
    if (!selectedVoiceId || !previewText.trim()) return

    try {
      const response = await ttsApi.generateSpeech({
        text: previewText,
        voice_id: selectedVoiceId,
      })

      if (response.success && response.data) {
        const url = ttsApi.getAudioUrl(response.data.audio_url || "")
        setAudioUrl(url)

        const audio = new Audio(url)
        audio.onended = () => setIsPlaying(false)
        setAudioElement(audio)
        audio.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("음성 미리보기 생성 실패:", error)
      toast({
        title: "미리보기 실패",
        description: "음성 미리보기를 생성할 수 없습니다.",
        variant: "destructive",
      })
    }
  }, [selectedVoiceId, previewText, toast])

  // 오디오 재생/일시정지
  const toggleAudio = useCallback(() => {
    if (!audioElement) {
      generateVoicePreview()
      return
    }

    if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      audioElement.play()
      setIsPlaying(true)
    }
  }, [audioElement, isPlaying, generateVoicePreview])

  // 최종 저장
  const handleSave = async () => {
    const finalPersona = buildPersona()
    if (!finalPersona.trim()) {
      toast({
        title: "입력 오류",
        description: "페르소나 정보를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const request: CreateCharacterRequest = {
        name: characterName,
        description: description || generatedData?.description || "",
        persona: finalPersona,
        voice_id: selectedVoiceId,
        category: category || generatedData?.category || "",
        tags: generatedData?.tags || [],
        sample_dialogue: generatedData?.sample_dialogue || "",
      }

      let response;
      if (initialData?.id) {
        response = await characterApi.updateCharacter(initialData.id, request)
      } else {
        response = await characterApi.createCharacter(request)
      }

      if (response.success && response.data) {
        toast({
          title: initialData?.id ? "수정 완료" : "저장 완료",
          description: initialData?.id ? "캐릭터 정보가 수정되었습니다." : "캐릭터가 성공적으로 저장되었습니다.",
        })
        onComplete(response.data)
      } else {
        throw new Error(response.error?.message || "캐릭터 처리 실패")
      }
    } catch (error) {
      console.error("캐릭터 저장/수정 실패:", error)
      toast({
        title: "실패",
        description: error instanceof Error ? error.message : "캐릭터 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 단계 표시기 */}
      <div className="flex items-center justify-between" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`진행 단계: ${currentStep}/${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${step === currentStep
                  ? "bg-primary text-primary-foreground"
                  : step < currentStep
                    ? "bg-primary/50 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }
              `}
              aria-current={step === currentStep ? "step" : undefined}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={`
                  flex-1 h-1 mx-2
                  ${step < currentStep ? "bg-primary" : "bg-muted"}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 기본 정보 입력 */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="characterName" className="text-foreground">
              캐릭터 이름 *
            </Label>
            <Input
              id="characterName"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="예: 헤르미온느 그레인저"
              className="bg-secondary/50 border-border text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-foreground">
              카테고리 (애니메이션, 영화, 역사 등)
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 영화"
              className="bg-secondary/50 border-border text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-foreground">
              간단한 설명 (선택)
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="캐릭터에 대한 추가 정보를 입력하세요"
              className="bg-secondary/50 border-border text-foreground"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              '다음'을 누르면 입력하신 이름을 바탕으로 AI가 상세한 성격과 말투를 자동으로 생성합니다.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Persona 상세 입력 */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="persona" className="text-foreground">
              페르소나 (전체) *
            </Label>
            <Textarea
              id="persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="AI가 생성한 내용을 확인하고 수정하세요..."
              rows={6}
              className="bg-secondary/50 border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="personality" className="text-foreground">성격</Label>
              <Textarea
                id="personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                rows={3}
                className="bg-secondary/50 border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label htmlFor="speechStyle" className="text-foreground">말투</Label>
              <Textarea
                id="speechStyle"
                value={speechStyle}
                onChange={(e) => setSpeechStyle(e.target.value)}
                rows={3}
                className="bg-secondary/50 border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label htmlFor="background" className="text-foreground">배경</Label>
              <Textarea
                id="background"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={3}
                className="bg-secondary/50 border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label htmlFor="goals" className="text-foreground">목표</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
                className="bg-secondary/50 border-border text-foreground text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Voice 선택 */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {loadingVoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Label className="text-foreground">음성 선택 *</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {voices.map((voice) => (
                  <label
                    key={voice.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedVoiceId === voice.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="voice"
                      value={voice.id}
                      checked={selectedVoiceId === voice.id}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{voice.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {voice.language} {voice.gender && `• ${voice.gender}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: 미리보기 */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="p-4 bg-card rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-3">생성된 캐릭터 정보</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">이름:</span> {characterName}</p>
              <p><span className="font-medium">페르소나:</span></p>
              <p className="text-muted-foreground whitespace-pre-wrap pl-4 text-xs">
                {buildPersona()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-card rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-3">음성 미리보기</h4>
            <div className="flex items-center gap-2">
              <Input
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                className="flex-1 bg-secondary/50 border-border text-foreground"
              />
              <Button onClick={toggleAudio} variant="outline" size="sm" className="border-border">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 네비게이션 버튼 */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={handleBack} className="text-muted-foreground" disabled={isGenerating}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? "취소" : "이전"}
        </Button>

        <Button
          onClick={currentStep === totalSteps ? handleSave : handleNext}
          disabled={isGenerating || (currentStep === 1 && !isStep1Valid()) || (currentStep === 3 && !isStep3Valid())}
          className="bg-primary text-primary-foreground min-w-[100px]"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentStep === totalSteps ? (
            "저장하고 사용하기"
          ) : (
            <>
              다음
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
