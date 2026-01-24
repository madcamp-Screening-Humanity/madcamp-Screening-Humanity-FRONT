"use client"

import { useState, useEffect, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { ArrowLeft, Loader2, RotateCcw, Check } from "lucide-react"

function DemoAvatar() {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#e8d4c4" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.7, 0]}>
        <capsuleGeometry args={[0.35, 0.6, 8, 16]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Left Arm */}
      <mesh position={[-0.5, 0.8, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Right Arm */}
      <mesh position={[0.5, 0.8, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.12, 1.55, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.12, 1.55, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

function AvatarScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <DemoAvatar />
      <ContactShadows
        position={[0, 0, 0]}
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
      />
      <Environment preset="studio" />
    </>
  )
}

export function AvatarPreview() {
  const { step, setStep, uploadedImage, setAvatarUrl } = useAppStore()
  const [isConverting, setIsConverting] = useState(true)
  const [conversionProgress, setConversionProgress] = useState(0)

  const isVisible = step === "avatar-preview"

  useEffect(() => {
    if (isVisible && isConverting) {
      const interval = setInterval(() => {
        setConversionProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsConverting(false)
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 300)

      return () => clearInterval(interval)
    }
  }, [isVisible, isConverting])

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
                  얼굴을 분석하고 3D 모델을 생성하고 있습니다
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
        ) : (
          <>
            <div className="flex-1 relative">
              <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
                <Suspense fallback={null}>
                  <AvatarScene />
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
