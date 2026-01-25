"use client"

import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function SignIn() {
    const handleLogin = () => {
        // Backend OAuth URL로 직접 이동
        window.location.href = `${API_BASE_URL}/api/auth/google/login`
    }

    return (
        <Button onClick={handleLogin} variant="outline">
            Sign in with Google
        </Button>
    )
}

export function SignOut() {
    const router = useRouter()
    const { setIsLoggedIn, setUserName, goToHome } = useAppStore()

    const handleLogout = async () => {
        try {
            // Backend 로그아웃 엔드포인트 호출
            const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            })

            if (response.ok || response.redirected) {
                // Zustand store 초기화
                setIsLoggedIn(false)
                setUserName("")
                goToHome()
                
                // 랜딩 페이지로 리다이렉트
                router.push("/")
            }
        } catch (error) {
            console.error("Logout error:", error)
            // 에러가 발생해도 로컬 상태는 초기화
            setIsLoggedIn(false)
            setUserName("")
            goToHome()
            router.push("/")
        }
    }

    return (
        <Button onClick={handleLogout} variant="ghost">
            Sign Out
        </Button>
    )
}
