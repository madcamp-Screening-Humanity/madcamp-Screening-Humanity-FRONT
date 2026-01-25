"use client"

import { useState, useEffect, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { ArrowLeft, Loader2, RotateCcw, Check, AlertCircle } from "lucide-react"
import { generationApi } from "@/lib/api/client"

function Character({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} position={[0, -1, 0]} scale={1.5} />
}

function AvatarScene({ glbUrl }: { glbUrl: string | null }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      {glbUrl && <Character url={glbUrl} />}
      <ContactShadows
        position={[0, -1, 0]}
        opacity={0.4}
        scale={5}
        blur={2}
        far={4}
      />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
        target={[0, 0, 0]}
      />
      <Environment preset="studio" />
    </>
  )
}

export function AvatarPreview() {
  const { step, setStep, uploadedImage, setAvatarUrl, generationJobId, setGenerationJobId } = useAppStore()
  const [isConverting, setIsConverting] = useState(true)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [currentStepText, setCurrentStepText] = useState("작업 대기 중...")
  const [resultGlbUrl, setResultGlbUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isVisible = step === "avatar-preview"

  useEffect(() => {
    if (isVisible && isConverting && generationJobId) {
      let isSubscribed = true

      const pollStatus = async () => {
        try {
          const result = await generationApi.pollUntilComplete(
            generationJobId,
            (status) => {
              if (isSubscribed) {
                setConversionProgress(status.progress)
                setCurrentStepText(mapStatusToText(status.current_step))
              }
            },
            2000 // Poll every 2s
          )

          if (isSubscribed) {
            if (result.success && result.data?.status === 'completed') {
              setIsConverting(false)
              const absoluteUrl = generationApi.getResultUrl(result.data.result_url || "")
              setResultGlbUrl(absoluteUrl)
              setAvatarUrl(absoluteUrl)
            } else {
              setError("생성에 실패했습니다: " + (result.error?.message || "알 수 없는 오류"))
              setIsConverting(false)
            }
          }
        } catch (e) {
          if (isSubscribed) {
            setError("네트워크 오류가 발생했습니다.")
            setIsConverting(false)
          }
        }
      }

      pollStatus()

      return () => { isSubscribed = false }
    } else if (isVisible && !generationJobId) {
      // If no job ID, maybe simulate or show error? 
      // For now, let's just complete instantly if it's a dev fallback
      // But better to expect a job ID from upload
      setIsConverting(false)
    }
  }, [isVisible, isConverting, generationJobId, setAvatarUrl])

  const mapStatusToText = (stage?: string) => {
    switch (stage) {
      case "style_transfer": return "스타일 변환 중..."
      case "generating_3d": return "3D 모델 생성 중..."
      case "converting_glb": return "웹용 최적화 중..."
      case "finished": return "완료!"
      default: return "처리 중..."
    }
  }

  const handleConfirm = () => {
    setAvatarUrl("custom-avatar")
    setStep("scenario-setup")
  }

  const handleBack = () => {
    setIsConverting(true)
    setConversionProgress(0)
    setStep("avatar-upload")
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
        <h1 className="text-lg font-semibold text-foreground">3D 미리보기</h1>
        <div className="w-20" />
      </header>

      <div className="flex-1 flex flex-col">
        {isConverting ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-6">
              <div className="relative w-32 h-32 mx-auto">
                {uploadedImage && (
                  <img
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Converting"
                    className="w-full h-full object-cover rounded-full opacity-50"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  3D 변환 중...
                </h2>
                <p className="text-muted-foreground">
                  {currentStepText}
                </p>
              </div>

              <div className="w-64 mx-auto">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(conversionProgress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round(Math.min(conversionProgress, 100))}%
                </p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">오류 발생</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={handleBack} variant="outline">다시 시도</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 relative">
              <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
                <Suspense fallback={null}>
                  <AvatarScene glbUrl={resultGlbUrl} />
                </Suspense>
              </Canvas>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm rounded-full border border-border">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  드래그하여 회전
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-card">
              <div className="max-w-md mx-auto space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <Check className="h-5 w-5 text-primary" />
                  <p className="text-sm text-foreground">
                    3D 아바타가 생성되었습니다!
                  </p>
                </div>

                <Button
                  onClick={handleConfirm}
                  className="w-full py-6 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  이 아바타로 시작하기
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
