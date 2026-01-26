import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AppStep =
  | "landing"
  | "mode-select"
  | "character-select"
  | "avatar-upload"
  | "avatar-preview"
  | "scenario-setup"
  | "script-preview"
  | "loading"
  | "chat"

export type GameMode = "actor" | "director"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  emotion?: string
  timestamp: Date
  audio_url?: string
}

export interface ChatHistory {
  id: string
  scenario: {
    opponent: string
    situation: string
  }
  messages: Message[]
  turnCount: number
  createdAt: Date
  updatedAt: Date
  generatedScript: string
  displayName: string
}

export interface Character {
  id: string
  name: string
  description?: string
  persona?: string
  voice_id?: string
  category?: string
  tags?: string[]
  sample_dialogue?: string
  image_url?: string
  is_preset: boolean
  user_id?: string
  created_at?: string
}

interface AppState {
  step: AppStep
  setStep: (step: AppStep) => void
  isLoggedIn: boolean
  setIsLoggedIn: (value: boolean) => void
  userName: string
  setUserName: (name: string) => void
  displayName: string
  setDisplayName: (name: string) => void
  gameMode: GameMode | null
  setGameMode: (mode: GameMode) => void
  avatarUrl: string | null
  setAvatarUrl: (url: string | null) => void
  uploadedImage: string | null
  setUploadedImage: (image: string | null) => void
  scenario: {
    opponent: string
    situation: string
  }
  setScenario: (scenario: { opponent: string; situation: string }) => void
  generatedScript: string
  setGeneratedScript: (script: string) => void
  messages: Message[]
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  turnCount: number
  incrementTurn: () => void
  setTurnCount: (count: number) => void
  chatHistories: ChatHistory[]
  currentChatId: string | null
  setCurrentChatId: (id: string | null) => void
  saveChatHistory: () => void
  loadChatHistory: (id: string) => void
  deleteChatHistory: (id: string) => void
  resetGame: () => void
  goToHome: () => void
  generationJobId: string | null
  setGenerationJobId: (id: string | null) => void
  selectedCharacter: Character | null
  setSelectedCharacter: (character: Character | null) => void
  // TTS 설정
  ttsMode: "realtime" | "delayed" | "on_click"
  setTtsMode: (mode: "realtime" | "delayed" | "on_click") => void
  ttsDelayMs: number
  setTtsDelayMs: (ms: number) => void
  ttsStreamingMode: number
  setTtsStreamingMode: (mode: number) => void
  ttsEnabled: boolean
  setTtsEnabled: (enabled: boolean) => void
  sessionId: string | null
  setSessionId: (id: string | null) => void
  // 턴 제한 설정
  maxTurns: number
  setMaxTurns: (turns: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      step: "landing",
      setStep: (step) => set({ step }),
      isLoggedIn: false,
      setIsLoggedIn: (value) => set({ isLoggedIn: value }),
      userName: "",
      setUserName: (name) => set({ userName: name }),
      displayName: "",
      setDisplayName: (name) => set({ displayName: name }),
      gameMode: null,
      setGameMode: (mode) => set({ gameMode: mode }),
      avatarUrl: null,
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      uploadedImage: null,
      setUploadedImage: (image) => set({ uploadedImage: image }),
      scenario: {
        opponent: "",
        situation: "",
      },
      setScenario: (scenario) => set({ scenario }),
      generatedScript: "",
      setGeneratedScript: (script) => set({ generatedScript: script }),
      generationJobId: null,
      setGenerationJobId: (id) => set({ generationJobId: id }),
      messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      turnCount: 0,
      incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
      setTurnCount: (count) => set({ turnCount: count }),
      chatHistories: [],
      currentChatId: null,
      setCurrentChatId: (id) => set({ currentChatId: id }),
      saveChatHistory: () => {
        const state = get()
        const { scenario, messages, turnCount, currentChatId, chatHistories, generatedScript, displayName } = state

        if (messages.length === 0) return

        const now = new Date()

        if (currentChatId) {
          // Update existing
          const updated = chatHistories.map(h =>
            h.id === currentChatId
              ? { ...h, messages, turnCount, updatedAt: now, generatedScript, displayName }
              : h
          )
          set({ chatHistories: updated })
        } else {
          // Create new
          const newHistory: ChatHistory = {
            id: Date.now().toString(),
            scenario,
            messages,
            turnCount,
            createdAt: now,
            updatedAt: now,
            generatedScript,
            displayName,
          }
          set({
            chatHistories: [newHistory, ...chatHistories],
            currentChatId: newHistory.id
          })
        }
      },
      loadChatHistory: (id) => {
        const state = get()
        const history = state.chatHistories.find(h => h.id === id)
        if (history) {
          set({
            scenario: history.scenario,
            messages: history.messages,
            turnCount: history.turnCount,
            currentChatId: id,
            generatedScript: history.generatedScript,
            displayName: history.displayName || state.userName,
            step: "chat"
          })
        }
      },
      deleteChatHistory: (id) => {
        set((state) => ({
          chatHistories: state.chatHistories.filter(h => h.id !== id)
        }))
      },
      resetGame: () =>
        set({
          step: "mode-select",
          gameMode: null,
          avatarUrl: null,
          uploadedImage: null,
          scenario: { opponent: "", situation: "" },
          messages: [],
          turnCount: 0,
          currentChatId: null,
          generatedScript: "",
        }),
      goToHome: () =>
        set({
          step: "landing",
          gameMode: null,
          avatarUrl: null,
          uploadedImage: null,
          scenario: { opponent: "", situation: "" },
          messages: [],
          turnCount: 0,
          currentChatId: null,
          generatedScript: "",
          selectedCharacter: null,
        }),
      selectedCharacter: null,
      setSelectedCharacter: (character) => set({ selectedCharacter: character }),
      // TTS 설정
      ttsMode: "realtime",
      setTtsMode: (mode) => set({ ttsMode: mode }),
      ttsDelayMs: 0,
      setTtsDelayMs: (ms) => set({ ttsDelayMs: ms }),
      ttsStreamingMode: 0,
      setTtsStreamingMode: (mode) => set({ ttsStreamingMode: mode }),
      ttsEnabled: true,
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),
      // 턴 제한 설정
      maxTurns: typeof window !== "undefined"
        ? parseInt(process.env.NEXT_PUBLIC_MAX_TURNS || "30", 10)
        : 30,
      setMaxTurns: (turns) => set({ maxTurns: turns }),
    }),
    {
      name: "life-theater-storage",
      partialize: (state) => ({
        chatHistories: state.chatHistories,
        userName: state.userName,
        displayName: state.displayName,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
)
