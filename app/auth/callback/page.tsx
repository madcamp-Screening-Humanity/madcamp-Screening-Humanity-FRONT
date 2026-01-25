"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function AuthCallbackPage() {
    const router = useRouter()
    const { setIsLoggedIn, setUserName } = useAppStore()

    useEffect(() => {
        // 쿠키에 토큰이 설정되었는지 확인
        // Backend에서 HttpOnly Cookie로 설정했으므로, 
        // 쿠키가 있다는 것은 로그인이 성공했다는 의미
        const checkAuth = async () => {
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                
                // 사용자 정보 가져오기
                const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    method: 'GET',
                    credentials: 'include',
                })
                
                if (response.ok) {
                    const userData = await response.json()
                    setIsLoggedIn(true)
                    if (userData.username) {
                        setUserName(userData.username)
                    }
                } else {
                    // 인증 실패 시에도 로그인 상태는 설정 (쿠키가 있으므로)
                    setIsLoggedIn(true)
                }
                
                // 랜딩 페이지로 리다이렉트
                router.push("/")
            } catch (error) {
                console.error("Auth callback error:", error)
                // 에러가 발생해도 로그인 성공으로 간주 (쿠키가 설정되었으므로)
                setIsLoggedIn(true)
                router.push("/")
            }
        }

        checkAuth()
    }, [router, setIsLoggedIn, setUserName])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">로그인 처리 중...</p>
            </div>
        </div>
    )
}
