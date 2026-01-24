import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AppStep =
  | "landing"
  | "mode-select"
  | "avatar-upload"
  | "avatar-preview"
  | "scenario-setup"
  | "script-preview"
  | "loading"
  | "chat"

export type GameMode = "actor" | "director"

export interface Message {
  id: string
  role: "user" | "ai" | "system"
  content: string
  emotion?: string
  timestamp: Date
}

export interface ChatHistory {
  id: string
  scenario: {
    background: string
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
    background: string
    opponent: string
    situation: string
  }
  setScenario: (scenario: { background: string; opponent: string; situation: string }) => void
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
        background: "",
        opponent: "",
        situation: "",
      },
      setScenario: (scenario) => set({ scenario }),
      generatedScript: "",
      setGeneratedScript: (script) => set({ generatedScript: script }),
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
          scenario: { background: "", opponent: "", situation: "" },
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
          scenario: { background: "", opponent: "", situation: "" },
          messages: [],
          turnCount: 0,
          currentChatId: null,
          generatedScript: "",
        }),
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
