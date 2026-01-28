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
  chatModel?: "gemini-2.5-flash" | "glm-4.7-flash"
}

export interface Character {
  id: string
  name: string
  description?: string
  persona?: string
  voice_id?: string
  category?: string
  tags?: string[]
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
  isAdmin: boolean
  setIsAdmin: (value: boolean) => void
  userName: string
  setUserName: (name: string) => void
  displayName: string
  setDisplayName: (name: string) => void
  gameMode: GameMode | null
  setGameMode: (mode: GameMode) => void
  chatModel: "gemini-2.5-flash" | "glm-4.7-flash" | null
  setChatModel: (model: "gemini-2.5-flash" | "glm-4.7-flash" | null) => void
  avatarUrl: string | null
  setAvatarUrl: (url: string | null) => void
  uploadedImage: string | null
  setUploadedImage: (image: string | null) => void
  scenario: {
    opponent: string
    situation: string
    background?: string
  }
  setScenario: (scenario: { opponent: string; situation: string; background?: string }) => void
  generatedScript: string
  setGeneratedScript: (script: string) => void
  messages: Message[]
  addMessage: (message: Message) => void
  updateMessage: (id: string, content: string, audio_url?: string) => void
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
  secondCharacter: Character | null
  setSecondCharacter: (character: Character | null) => void
  // TTS 설정
  ttsMode: "realtime" | "delayed" | "on_click"
  setTtsMode: (mode: "realtime" | "delayed" | "on_click") => void
  ttsDelayMs: number
  setTtsDelayMs: (ms: number) => void
  ttsStreamingMode: number
  setTtsStreamingMode: (mode: number) => void
  ttsEnabled: boolean
  setTtsEnabled: (enabled: boolean) => void
  ttsSpeed: number
  setTtsSpeed: (speed: number) => void
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
      isAdmin: false,
      setIsAdmin: (value) => set({ isAdmin: value }),
      userName: "",
      setUserName: (name) => set({ userName: name }),
      displayName: "",
      setDisplayName: (name) => set({ displayName: name }),
      gameMode: null,
      setGameMode: (mode) => set({ gameMode: mode }),
      chatModel: null,
      setChatModel: (model) => set({ chatModel: model }),
      avatarUrl: null,
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      uploadedImage: null,
      setUploadedImage: (image) => set({ uploadedImage: image }),
      scenario: {
        opponent: "",
        situation: "",
        background: "",
      },
      setScenario: (scenario) => set({ scenario }),
      generatedScript: "",
      setGeneratedScript: (script) => set({ generatedScript: script }),
      generationJobId: null,
      setGenerationJobId: (id) => set({ generationJobId: id }),
      messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, content, audio_url) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content, audio_url } : msg
          ),
        })),
      setMessages: (messages) => set({ messages }),
      turnCount: 0,
      incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
      setTurnCount: (count) => set({ turnCount: count }),
      chatHistories: [],
      currentChatId: null,
      setCurrentChatId: (id) => set({ currentChatId: id }),
      saveChatHistory: () => {
        const state = get()
        const { scenario, messages, turnCount, currentChatId, chatHistories, generatedScript, displayName, chatModel } = state

        if (messages.length === 0) return

        const now = new Date()

        if (currentChatId) {
          // Update existing
          const updated = chatHistories.map(h =>
            h.id === currentChatId
              ? { ...h, messages, turnCount, updatedAt: now, generatedScript, displayName, chatModel: chatModel || undefined }
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
            chatModel: chatModel || undefined,
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
            step: "chat",
            chatModel: history.chatModel || "glm-4.7-flash",
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
          chatModel: null,
          avatarUrl: null,
          uploadedImage: null,
          scenario: { opponent: "", situation: "", background: "" },
          messages: [],
          turnCount: 0,
          currentChatId: null,
          generatedScript: "",
          selectedCharacter: null,
          secondCharacter: null,
        }),
      goToHome: () =>
        set({
          step: "landing",
          gameMode: null,
          chatModel: null,
          avatarUrl: null,
          uploadedImage: null,
          scenario: { opponent: "", situation: "", background: "" },
          messages: [],
          turnCount: 0,
          currentChatId: null,
          generatedScript: "",
          selectedCharacter: null,
          secondCharacter: null,
        }),
      selectedCharacter: null,
      setSelectedCharacter: (character) => set({ selectedCharacter: character }),
      secondCharacter: null,
      setSecondCharacter: (character) => set({ secondCharacter: character }),
      // TTS 설정
      ttsMode: "realtime",
      setTtsMode: (mode) => set({ ttsMode: mode }),
      ttsDelayMs: 0,
      setTtsDelayMs: (ms) => set({ ttsDelayMs: ms }),
      ttsStreamingMode: 0,
      setTtsStreamingMode: (mode) => set({ ttsStreamingMode: mode }),
      ttsEnabled: true,
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      ttsSpeed: 1.0,
      setTtsSpeed: (speed) => set({ ttsSpeed: speed }),
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
        isAdmin: state.isAdmin,
        ttsMode: state.ttsMode,
        ttsDelayMs: state.ttsDelayMs,
        ttsStreamingMode: state.ttsStreamingMode,
        ttsEnabled: state.ttsEnabled,
        ttsSpeed: state.ttsSpeed,
      }),
    }
  )
)