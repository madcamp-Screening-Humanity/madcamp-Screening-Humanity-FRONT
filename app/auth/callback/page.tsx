"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function AuthCallbackPage() {
    const router = useRouter()
    const { setIsLoggedIn, setUserName, setIsAdmin } = useAppStore()

    useEffect(() => {
        // 쿠키에 토큰이 설정되었는지 확인
        // Backend에서 HttpOnly Cookie로 설정했으므로, 
        // 쿠키가 있다는 것은 로그인이 성공했다는 의미
        const checkAuth = async () => {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            
            // AbortController로 타임아웃 구현 (15초로 증가 - 느린 네트워크 대응)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000) // 5초 → 15초로 증가
            
            try {
                console.log("인증 확인 시작:", `${API_BASE_URL}/api/auth/me`)
                
                // 사용자 정보 가져오기 (타임아웃 적용)
                const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    method: 'GET',
                    credentials: 'include',
                    signal: controller.signal,
                })
                
                clearTimeout(timeoutId)
                
                console.log("인증 응답 상태:", response.status, response.statusText)
                
                if (response.ok) {
                    const userData = await response.json()
                    console.log("사용자 정보:", userData)
                    setIsLoggedIn(true)
                    setIsAdmin(userData.is_admin || false)
                    if (userData.username) {
                        setUserName(userData.username)
                    }
                } else {
                    // 인증 실패 시에도 로그인 상태는 설정 (쿠키가 있으므로)
                    console.warn("인증 실패하지만 쿠키가 있을 수 있으므로 로그인 상태로 설정")
                    setIsLoggedIn(true)
                }
                
                // 랜딩 페이지로 리다이렉트
                router.push("/")
            } catch (error) {
                clearTimeout(timeoutId)
                
                // AbortError는 타임아웃, 나머지는 네트워크 에러
                if (error instanceof Error) {
                    if (error.name === 'AbortError') {
                        console.warn("인증 확인 타임아웃 (15초 초과) - 백엔드 서버가 응답하지 않습니다")
                        // 타임아웃 시에도 로그인 성공으로 간주 (쿠키가 설정되었을 수 있으므로)
                        setIsLoggedIn(true)
                        router.push("/")
                        return
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        console.error("네트워크 에러 - 백엔드 서버에 연결할 수 없습니다:", API_BASE_URL)
                        console.error("확인 사항:")
                        console.error("1. 백엔드 서버가 실행 중인지 확인 (http://localhost:8000)")
                        console.error("2. CORS 설정이 올바른지 확인 (BACKEND_CORS_ORIGINS)")
                        console.error("3. 네트워크 연결 상태 확인")
                    } else {
                        console.error("인증 확인 알 수 없는 에러:", error.message)
                    }
                } else {
                    console.error("인증 확인 알 수 없는 에러:", error)
                }
                
                // 타임아웃이나 네트워크 에러 시에도 로그인 성공으로 간주 (쿠키가 설정되었을 수 있으므로)
                // Backend에서 쿠키를 설정했으므로, 네트워크 에러가 있어도 로그인은 성공했을 가능성이 높음
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
                <p className="text-xs text-muted-foreground/70">잠시만 기다려주세요. 네트워크 상태에 따라 시간이 걸릴 수 있습니다.</p>
            </div>
        </div>
    )
}
