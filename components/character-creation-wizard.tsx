"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Loader2, Sparkles, AlertCircle, Play, Pause, RefreshCw } from "lucide-react"
import { characterApi, ttsApi } from "@/lib/api/client"
import { useToast } from "@/hooks/use-toast"
import { generateCharacterSpec } from "@/lib/api/gemini"
import type { Character, CreateCharacterRequest, Voice } from "@/lib/api/types"

interface CharacterCreationWizardProps {
  onComplete: (character: Character) => void
  onCancel: () => void
  initialData?: Character | null
}

/**
 * 캐릭터 생성 위저드 컴포넌트
 * Step 1: 필수 정보 입력 (이름, 카테고리, 작품명)
 * Step 2: AI 생성된 상세 정보 확인 및 편집
 * Step 3: 음성 선택
 * Step 4: 최종 확인 및 저장
 */
export function CharacterCreationWizard({
  onComplete,
  onCancel,
  initialData,
}: CharacterCreationWizardProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // === Step 1: 필수 기본 정보 ===
  const [characterName, setCharacterName] = useState(initialData?.name || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [sourceWork, setSourceWork] = useState("") // 작품명 (신규)

  // === Step 2: 상세 정보 (AI 생성 대상) ===
  const [description, setDescription] = useState(initialData?.description || "") // 컨셉/설명
  const [worldview, setWorldview] = useState(initialData?.worldview || "") // 세계관
  
  const [gender, setGender] = useState(initialData?.gender || "")
  const [species, setSpecies] = useState(initialData?.species || "")
  const [age, setAge] = useState(initialData?.age || "")
  const [height, setHeight] = useState(initialData?.height || "")
  const [job, setJob] = useState(initialData?.job || "")
  
  const [personality, setPersonality] = useState(initialData?.personality || "")
  const [appearance, setAppearance] = useState(initialData?.appearance || "")
  const [likes, setLikes] = useState(initialData?.likes?.join(", ") || "")
  const [dislikes, setDislikes] = useState(initialData?.dislikes?.join(", ") || "")
  const [speechStyle, setSpeechStyle] = useState(initialData?.speech_style || "")
  const [thoughts, setThoughts] = useState(initialData?.thoughts || "")
  const [features, setFeatures] = useState(initialData?.features || "")
  const [habits, setHabits] = useState(initialData?.habits || "")
  const [guidelines, setGuidelines] = useState(initialData?.guidelines || "")

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // 저장 중 상태 추가
  const [isAiGenerated, setIsAiGenerated] = useState(false) // AI 생성 여부 체크
  
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 2 // 초기 생성 외에 2번 더 허용 (총 3회)

  // === Step 3: 음성 ===
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(initialData?.voice_id || "")
  const [loadingVoices, setLoadingVoices] = useState(false)

  // === Step 4: 미리보기 ===
  const [previewText, setPreviewText] = useState("안녕하세요! 반가워요.")
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
      if (response.success && response.data?.voices) {
        setVoices(response.data.voices)
        if (!selectedVoiceId && response.data.voices.length > 0) {
          setSelectedVoiceId(response.data.voices[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load voices:", error)
    } finally {
      setLoadingVoices(false)
    }
  }, [selectedVoiceId])

  // AI 자동 생성 로직
  const runAIGeneration = async (isRetry = false) => {
    if (!characterName) return;
    if (isRetry && retryCount >= MAX_RETRIES) {
        toast({ title: "재생성 횟수 초과", description: "AI 생성은 최대 3회까지만 가능합니다.", variant: "destructive" });
        return;
    }
    
    setIsGenerating(true)
    if (isRetry) {
        setRetryCount(prev => prev + 1)
    }

    try {
      const spec = await generateCharacterSpec({
        name: characterName,
        category: category,
        source_work: sourceWork,
      })

      // 필드 채우기
      if (spec.gender) setGender(spec.gender)
      if (spec.species) setSpecies(spec.species)
      if (spec.age) setAge(spec.age)
      if (spec.height) setHeight(spec.height)
      if (spec.job) setJob(spec.job)
      if (spec.worldview) setWorldview(spec.worldview)
      
      setPersonality(spec.personality)
      setAppearance(spec.appearance)
      setDescription(spec.description)
      setLikes(spec.likes.join(", "))
      setDislikes(spec.dislikes.join(", "))
      setSpeechStyle(spec.speech_style)
      setThoughts(spec.thoughts)
      setFeatures(spec.features)
      setHabits(spec.habits)
      setGuidelines(spec.guidelines)

      setIsAiGenerated(true)
      toast({
        title: "생성 완료",
        description: "AI가 상세 정보를 채웠습니다.",
      })
    } catch (error) {
      console.error("AI Generation Failed:", error)
      toast({
        title: "생성 실패",
        description: error instanceof Error ? error.message : "AI 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Step 1 -> Step 2 이동 핸들러
  const handleStep1Next = async () => {
    if (!characterName) {
      toast({ title: "이름을 입력해주세요", variant: "destructive" })
      return
    }
    
    // 이미 생성된 적이 있거나, 수정 모드(initialData 존재)가 아닐 때만 자동 생성 수행
    if (!isAiGenerated && !initialData) {
      await runAIGeneration(false); // 초기 생성은 횟수 차감 안 함
    }
    
    setCurrentStep(2);
  }

  // 저장용 텍스트 (호환성) - 프리뷰용
  const buildFullPersona = () => {
    return [
      `캐릭터 이름: ${characterName}`,
      `성별: ${gender}`,
      `종: ${species}`,
      `직업: ${job}`,
      `나이: ${age}`,
      `키: ${height}`,
      `세계관: ${worldview}`,
      `성격: ${personality}`,
      `외모: ${appearance}`,
      `설명: ${description}`,
      `좋아하는 것: ${likes}`,
      `싫어하는 것: ${dislikes}`,
      `말투: ${speechStyle}`,
      `생각: ${thoughts}`,
      `특징: ${features}`,
      `${characterName}의 말버릇: ${habits}`,
      `${characterName}의 가이드라인:\n${guidelines}`
    ].join("\n\n")
  }

  // 저장 핸들러
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const request: CreateCharacterRequest = {
        name: characterName,
        category,
        description,
        gender,
        species,
        age,
        height,
        job,
        worldview, // 세계관 필드 추가
        personality,
        appearance,
        likes: likes.split(",").map(s => s.trim()).filter(Boolean),
        dislikes: dislikes.split(",").map(s => s.trim()).filter(Boolean),
        speech_style: speechStyle,
        thoughts,
        features,
        habits,
        guidelines,
        voice_id: selectedVoiceId,
      }

      let response
      if (initialData?.id) {
        response = await characterApi.updateCharacter(initialData.id, request)
      } else {
        response = await characterApi.createCharacter(request)
      }

      if (response.success && response.data) {
        toast({ title: "저장 완료" })
        onComplete(response.data)
      } else {
        throw new Error(response.error?.message || "저장 실패")
      }
    } catch (error) {
      toast({ title: "오류 발생", description: String(error), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    else onCancel()
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === currentStep ? "bg-primary text-primary-foreground" :
              step < currentStep ? "bg-primary/50 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              {step}
            </div>
            {step < totalSteps && <div className={`flex-1 h-1 mx-2 ${step < currentStep ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold">필수 정보 입력</h3>
            <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
              <div>
                <Label>캐릭터 이름 *</Label>
                <Input value={characterName} onChange={e => setCharacterName(e.target.value)} placeholder="예: 해리 포터" className="text-lg font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>카테고리</Label>
                  <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="예: 판타지 소설" />
                </div>
                <div>
                  <Label>작품명 (출처)</Label>
                  <Input value={sourceWork} onChange={e => setSourceWork(e.target.value)} placeholder="예: 해리 포터와 마법사의 돌" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg text-sm text-muted-foreground border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">AI 자동 생성</p>
                <p>위 정보를 입력하고 '다음'을 누르면, AI가 캐릭터의 상세 설정(외모, 성격, 말버릇 등)을 자동으로 완성해줍니다.</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b border-border">
              <h3 className="text-lg font-semibold">상세 설정</h3>
              <Button onClick={() => runAIGeneration(true)} disabled={isGenerating || retryCount >= MAX_RETRIES} size="sm" variant="outline" className={retryCount >= MAX_RETRIES ? "opacity-50" : ""}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                AI 다시 생성 ({Math.max(0, MAX_RETRIES - retryCount)}회 남음)
              </Button>
            </div>

            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
               <h4 className="text-sm font-semibold text-muted-foreground">기본 스펙</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label>직업</Label>
                   <Input value={job} onChange={e => setJob(e.target.value)} />
                 </div>
                 <div>
                   <Label>세계관</Label>
                   <Input value={worldview} onChange={e => setWorldview(e.target.value)} />
                 </div>
                 <div>
                   <Label>성별</Label>
                   <Input value={gender} onChange={e => setGender(e.target.value)} />
                 </div>
                 <div>
                   <Label>종족</Label>
                   <Input value={species} onChange={e => setSpecies(e.target.value)} />
                 </div>
                 <div>
                   <Label>나이</Label>
                   <Input value={age} onChange={e => setAge(e.target.value)} />
                 </div>
                 <div>
                   <Label>키</Label>
                   <Input value={height} onChange={e => setHeight(e.target.value)} />
                 </div>
               </div>
            </div>

            {/* 상세 정보 섹션 */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold text-muted-foreground">페르소나 상세</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>설명 (배경 스토리)</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>성격</Label>
                  <Textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>외모</Label>
                  <Textarea value={appearance} onChange={e => setAppearance(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>좋아하는 것</Label>
                    <Textarea value={likes} onChange={e => setLikes(e.target.value)} rows={2} placeholder="콤마(,)로 구분" />
                  </div>
                  <div>
                    <Label>싫어하는 것</Label>
                    <Textarea value={dislikes} onChange={e => setDislikes(e.target.value)} rows={2} placeholder="콤마(,)로 구분" />
                  </div>
                </div>
                <div>
                  <Label>말투</Label>
                  <Textarea value={speechStyle} onChange={e => setSpeechStyle(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>생각 (속마음)</Label>
                  <Textarea value={thoughts} onChange={e => setThoughts(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>특징</Label>
                  <Textarea value={features} onChange={e => setFeatures(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>말버릇</Label>
                  <Input value={habits} onChange={e => setHabits(e.target.value)} />
                </div>
                <div>
                  <Label>가이드라인</Label>
                  <Textarea value={guidelines} onChange={e => setGuidelines(e.target.value)} rows={3} />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold">음성 선택</h3>
            {loadingVoices ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                {voices.map(voice => (
                  <div key={voice.id} 
                    onClick={() => setSelectedVoiceId(voice.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex justify-between items-center ${selectedVoiceId === voice.id ? "border-primary bg-primary/5" : "border-transparent bg-secondary hover:bg-secondary/80"}`}
                  >
                    <div>
                      <p className="font-medium">{voice.name}</p>
                      <p className="text-xs text-muted-foreground">{voice.language}</p>
                    </div>
                    {selectedVoiceId === voice.id && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold">최종 확인</h3>
            <div className="bg-secondary/30 p-4 rounded-lg space-y-2 text-sm">
              <p><strong>이름:</strong> {characterName}</p>
              <p><strong>작품:</strong> {sourceWork} ({category})</p>
              <p><strong>직업:</strong> {job}</p>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="font-semibold mb-2">프리뷰 페르소나:</p>
                <div className="bg-black/20 p-2 rounded max-h-48 overflow-y-auto">
                   <pre className="whitespace-pre-wrap text-xs">{buildFullPersona()}</pre>
                </div>
              </div>
            </div>
            {isGenerating && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
                        <Loader2 className="animate-spin text-primary" />
                        <span>AI가 캐릭터 정보를 생성 중입니다...</span>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={handleBack} disabled={isGenerating}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {currentStep === 1 ? "취소" : "이전"}
        </Button>
        <Button onClick={currentStep === 1 ? handleStep1Next : (currentStep === totalSteps ? handleSave : handleNext)} 
           disabled={isGenerating || isSaving || (currentStep === 1 && !characterName)}>
           {isGenerating || isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
             <>
               {currentStep === totalSteps ? "완료" : "다음"} 
               <ArrowRight className="w-4 h-4 ml-2" />
             </>
           )}
        </Button>
      </div>
    </div>
  )
}
