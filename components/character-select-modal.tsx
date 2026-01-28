"use client"

import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store"
import { characterApi } from "@/lib/api/client"
import { CharacterCard } from "@/components/character-card"
import { useToast } from "@/hooks/use-toast"
import { CHARACTER_LAYOUT } from "@/lib/config/character"
import { Sparkles, UserPlus, Loader2, Check, X } from "lucide-react"
import type { Character } from "@/lib/api/types"

// CharacterCreationWizard는 lazy load
const CharacterCreationWizard = lazy(() =>
  import("@/components/character-creation-wizard").then(module => ({ default: module.CharacterCreationWizard }))
)

export function CharacterSelectModal() {
  const { step, setStep, gameMode, setSelectedCharacter, selectedCharacter, secondCharacter, setSecondCharacter, goToHome, isLoggedIn } = useAppStore()
  const { toast } = useToast()
  const isOpen = step === "character-select"

  const [activeTab, setActiveTab] = useState<"presets" | "create" | "saved">("presets")
  const [presetCharacters, setPresetCharacters] = useState<Character[]>([])
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmingCharacter, setConfirmingCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [hasWizardDirty, setHasWizardDirty] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)

  // 감독 모드용: 첫 번째 캐릭터는 로컬 state로 관리 (선택 중인 상태)
  const [firstCharacter, setFirstCharacter] = useState<Character | null>(null)

  const loadPresetCharacters = useCallback(async () => {
    setLoading(true)
    try {
      console.log("사전설정 캐릭터 로드 시작...")
      const response = await characterApi.listPresets()
      console.log("사전설정 캐릭터 응답:", response)

      if (response.success && response.data) {
        const characters = response.data.characters || []
        console.log("로드된 사전설정 캐릭터 수:", characters.length)
        setPresetCharacters(characters)
      } else {
        // 사전설정 캐릭터는 JSON 파일에서 로드하므로 에러가 발생해도 빈 배열로 처리
        console.warn("사전설정 캐릭터 로드 실패, 빈 배열로 설정:", response)
        setPresetCharacters([])
      }
    } catch (error) {
      // 사전설정 캐릭터는 JSON 파일에서 로드하므로 에러가 발생해도 빈 배열로 처리
      console.warn("사전설정 캐릭터 로드 예외, 빈 배열로 설정:", error)
      setPresetCharacters([])
    } finally {
      console.log("사전설정 캐릭터 로드 완료, 로딩 해제")
      setLoading(false)
    }
  }, [])

  const loadSavedCharacters = useCallback(async () => {
    setLoading(true)
    try {
      console.log("저장된 캐릭터 로드 시작...")
      const response = await characterApi.listMyCharacters()
      console.log("저장된 캐릭터 응답:", response)

      if (response.success && response.data) {
        const characters = response.data.characters || []
        console.log("로드된 저장된 캐릭터 수:", characters.length)
        setSavedCharacters(characters)
      } else {
        // 에러 응답 처리
        const errorMessage = response.error?.message || "저장된 캐릭터를 불러올 수 없습니다."
        console.error("저장된 캐릭터 로드 실패:", {
          success: response.success,
          error: response.error,
          fullResponse: response
        })
        setSavedCharacters([]) // 빈 배열로 설정하여 로딩 해제

        // 네트워크 에러가 아닌 경우에만 Toast 표시 (네트워크 에러는 이미 표시됨)
        if (response.error?.code !== 'NETWORK_ERROR') {
          toast({
            title: "로드 실패",
            description: errorMessage,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("저장된 캐릭터 로드 예외:", error)
      setSavedCharacters([]) // 빈 배열로 설정하여 로딩 해제
      toast({
        title: "로드 실패",
        description: error instanceof Error ? error.message : "저장된 캐릭터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      console.log("저장된 캐릭터 로드 완료, 로딩 해제")
      setLoading(false)
    }
  }, [toast])

  // 모달이 열릴 때 초기 로드
  useEffect(() => {
    if (isOpen) {
      // 모달이 열리면 기본 탭(사전설정) 로드
      if (activeTab === "presets" && presetCharacters.length === 0) {
        loadPresetCharacters()
      }
    }
  }, [isOpen]) // isOpen만 의존성으로 사용

  // 탭 변경 시 로드
  useEffect(() => {
    if (isOpen && activeTab === "presets" && presetCharacters.length === 0) {
      loadPresetCharacters()
    } else if (isOpen && activeTab === "saved" && savedCharacters.length === 0) {
      loadSavedCharacters()
    }
  }, [isOpen, activeTab]) // activeTab 변경 시에만 로드

  const handleCharacterSelect = useCallback((character: Character) => {
    if (gameMode === "actor") {
      // 주연 모드: 1개 캐릭터만 선택하고 바로 진행
      setSelectedCharacter(character)
      setSecondCharacter(null) // 주연 모드에서는 두 번째 캐릭터 초기화
      setStep("scenario-setup")
    } else if (gameMode === "director") {
      // 감독 모드: 2개 캐릭터 선택 필요
      
      // 이미 선택 완료된 상태에서 같은 캐릭터를 다시 클릭하면 선택 해제
      if (selectedCharacter && selectedCharacter.id === character.id) {
        // 첫 번째 캐릭터 선택 해제
        setSelectedCharacter(null)
        setSecondCharacter(null)
        setFirstCharacter(null)
        toast({
          title: "선택 취소",
          description: "캐릭터 선택이 취소되었습니다.",
        })
      } else if (secondCharacter && secondCharacter.id === character.id) {
        // 두 번째 캐릭터 선택 해제
        setSecondCharacter(null)
        setSelectedCharacter(null)
        setFirstCharacter(null)
        toast({
          title: "선택 취소",
          description: "캐릭터 선택이 취소되었습니다.",
        })
      } else if (!firstCharacter) {
        // 첫 번째 캐릭터 선택
        setFirstCharacter(character)
        toast({
          title: "첫 번째 캐릭터 선택됨",
          description: `${character.name}이(가) 선택되었습니다. 두 번째 캐릭터를 선택해주세요.`,
        })
      } else if (firstCharacter.id === character.id) {
        // 같은 캐릭터를 다시 클릭하면 선택 해제
        setFirstCharacter(null)
        toast({
          title: "선택 취소",
          description: "첫 번째 캐릭터 선택이 취소되었습니다.",
        })
      } else {
        // 두 번째 캐릭터 선택 완료
        setSecondCharacter(character)
        // 첫 번째 캐릭터를 주 캐릭터로 설정
        setSelectedCharacter(firstCharacter)
        setFirstCharacter(null) // 로컬 state 초기화
        toast({
          title: "캐릭터 선택 완료",
          description: `${firstCharacter.name}과(와) ${character.name}이(가) 선택되었습니다.`,
        })
        // 다음 단계로 진행
        setStep("scenario-setup")
      }
    }
  }, [gameMode, firstCharacter, setSelectedCharacter, setSecondCharacter, setStep, toast])

  const handleWizardComplete = useCallback((character: Character) => {
    setSelectedCharacter(character)
    setShowWizard(false)

    // 저장된 캐릭터 목록 새로고침
    loadSavedCharacters()

    // 캐릭터 저장 후 시나리오 설정으로 이동 (모든 모드에서 동일)
    setStep("scenario-setup")
  }, [setSelectedCharacter, setStep, loadSavedCharacters])

  const handleWizardCancel = useCallback(() => {
    setShowWizard(false)
    setEditingCharacter(null)
  }, [])

  const handleEditCharacter = useCallback((character: Character) => {
    setEditingCharacter(character)
    setShowWizard(true)
  }, [])

  const handleDeleteCharacter = useCallback(async (characterId: string) => {
    if (!confirm("정말 이 캐릭터를 삭제하시겠습니까?")) return

    try {
      const response = await characterApi.deleteCharacter(characterId)
      if (response.success) {
        toast({
          title: "삭제 완료",
          description: "캐릭터가 삭제되었습니다.",
        })
        loadSavedCharacters()
      } else {
        throw new Error(response.error?.message || "삭제 실패")
      }
    } catch (error) {
      console.error("캐릭터 삭제 실패:", error)
      toast({
        title: "삭제 실패",
        description: error instanceof Error ? error.message : "캐릭터를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }, [loadSavedCharacters, toast])

  const handleConfirm = useCallback(() => {
    if (confirmingCharacter) {
      handleCharacterSelect(confirmingCharacter)
      setShowConfirm(false)
      setConfirmingCharacter(null)
    }
  }, [confirmingCharacter, handleCharacterSelect])

  const handleCancel = useCallback(() => {
    setShowConfirm(false)
    setConfirmingCharacter(null)
  }, [])

  const handleClose = useCallback(() => {
    setStep("mode-select")
  }, [setStep])

  // 나만의 캐릭터 만들기: 로그인 필수. 비로그인 시 토스트 후 진입 차단.
  const openWizardOrPromptLogin = useCallback(() => {
    if (!isLoggedIn) {
      toast({
        title: "로그인 후 나만의 캐릭터를 만들 수 있습니다.",
        variant: "destructive",
      })
      return
    }
    setShowWizard(true)
  }, [isLoggedIn, toast])

  if (showWizard) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (hasWizardDirty && !window.confirm("저장하지 않고 나가시겠습니까? 입력한 데이터가 사라집니다.")) return
            setShowWizard(false)
          }
        }}
      >
        <DialogContent className="w-full h-full sm:h-auto sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              나만의 캐릭터 만들기
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              단계별로 캐릭터 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <CharacterCreationWizard
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
              initialData={editingCharacter}
              onDirtyChange={setHasWizardDirty}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="w-full h-full sm:h-auto sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              캐릭터 선택
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              사전설정된 캐릭터를 선택하거나 나만의 캐릭터를 만들어보세요
            </DialogDescription>
          </DialogHeader>

          {/* 탭 */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab("presets")}
              className={`
                flex-1 py-2 text-sm font-medium transition-colors
                ${activeTab === "presets"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              사전설정 캐릭터
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`
                flex-1 py-2 text-sm font-medium transition-colors
                ${activeTab === "saved"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              저장된 캐릭터
            </button>
            <button
              onClick={openWizardOrPromptLogin}
              className={`
                flex-1 py-2 text-sm font-medium transition-colors
                ${activeTab === "create"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              새로 만들기
            </button>
          </div>

          {/* 내용 */}
          <div className="py-4">
            {/* 감독 모드 안내 메시지 */}
            {gameMode === "director" && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-foreground">
                  {!firstCharacter && !selectedCharacter ? (
                    <span>🎭 첫 번째 캐릭터를 선택해주세요</span>
                  ) : firstCharacter && !secondCharacter ? (
                    <span>✅ <strong>{firstCharacter.name}</strong> 선택됨 → 두 번째 캐릭터를 선택해주세요</span>
                  ) : selectedCharacter && secondCharacter ? (
                    <span>✅ <strong>{selectedCharacter.name}</strong>과(와) <strong>{secondCharacter.name}</strong> 선택 완료!</span>
                  ) : (
                    <span>🎭 첫 번째 캐릭터를 선택해주세요</span>
                  )}
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeTab === "presets" ? (
              <div className="space-y-4">
                {presetCharacters.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    사전설정 캐릭터가 없습니다.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {presetCharacters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        isSelected={
                          gameMode === "director"
                            ? firstCharacter?.id === character.id || selectedCharacter?.id === character.id || secondCharacter?.id === character.id
                            : selectedCharacterId === character.id
                        }
                        onClick={() => handleCharacterSelect(character)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === "saved" ? (
              <div className="space-y-4">
                {savedCharacters.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      저장된 캐릭터가 없습니다.
                    </p>
                    <Button
                      onClick={openWizardOrPromptLogin}
                      variant="outline"
                      className="border-border"
                      aria-label="새 캐릭터 만들기"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      새로 만들기
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedCharacters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        isSelected={
                          gameMode === "director"
                            ? firstCharacter?.id === character.id || selectedCharacter?.id === character.id || secondCharacter?.id === character.id
                            : selectedCharacterId === character.id
                        }
                        onClick={() => handleCharacterSelect(character)}
                        onEdit={handleEditCharacter}
                        onDelete={handleDeleteCharacter}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog >

      {/* 확인 모달 */}
      {
        showConfirm && confirmingCharacter && (
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">캐릭터 선택 확인</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  선택한 캐릭터로 진행하시겠습니까?
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-3">
                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-2">
                    {confirmingCharacter.name}
                  </h4>
                  {confirmingCharacter.description && (
                    <p className="text-sm text-muted-foreground">
                      {confirmingCharacter.description}
                    </p>
                  )}
                  {confirmingCharacter.category && (
                    <p className="text-xs text-primary mt-2">
                      카테고리: {confirmingCharacter.category}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="border-border"
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="bg-primary text-primary-foreground"
                >
                  <Check className="h-4 w-4 mr-2" />
                  확인
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    </>
  )
}
