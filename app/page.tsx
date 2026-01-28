"use client"

import { LandingPage } from "@/components/landing-page"
import { ModeSelectModal } from "@/components/mode-select-modal"
import { CharacterSelectModal } from "@/components/character-select-modal"
import { AvatarUpload } from "@/components/avatar-upload"

import { ScenarioSetup } from "@/components/scenario-setup"
import { ScriptPreview } from "@/components/script-preview"
import { LoadingScreen } from "@/components/loading-screen"
import { ChatRoom } from "@/components/chat-room"
import { useAppStore } from "@/lib/store"

export default function Home() {
  const { step, isLoggedIn } = useAppStore()

  return (
    <main className="min-h-screen bg-background" suppressHydrationWarning>
      {/* Landing - shown when not logged in */}
      {step === "landing" && <LandingPage />}

      {/* Mode Selection Modal */}
      <ModeSelectModal />

      {/* Character Select Modal */}
      <CharacterSelectModal />

      {/* Avatar Upload */}
      <AvatarUpload />

      {/* Scenario Setup */}
      {step === "scenario-setup" && isLoggedIn && <ScenarioSetup />}

      {/* Script Preview - AI generated situation script */}
      {step === "script-preview" && isLoggedIn && <ScriptPreview />}

      {/* Loading Screen */}
      {step === "loading" && isLoggedIn && <LoadingScreen />}

      {/* Chat Room */}
      {step === "chat" && isLoggedIn && <ChatRoom />}
    </main >
  )
}
