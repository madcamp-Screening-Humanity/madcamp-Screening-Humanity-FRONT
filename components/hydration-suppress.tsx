"use client"

import { useEffect } from "react"

/**
 * 브라우저 확장 프로그램으로 인한 hydration 경고 억제
 * 브라우저 확장 프로그램이 HTML에 인라인 스타일을 추가하여 발생하는 hydration 오류를 필터링합니다.
 * 개발 환경에서만 작동합니다 (프로덕션에서는 실제 hydration 오류를 확인할 수 있도록).
 */
export function HydrationSuppress() {
  useEffect(() => {
    // 클라이언트 사이드에서만 실행 (typeof window 체크)
    if (typeof window === 'undefined') return
    
    // 개발 환경에서만 hydration 경고 필터링
    // process.env.NODE_ENV는 빌드 타임에 결정되므로, 프로덕션 빌드에서는 항상 'production'
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      const originalError = console.error
      
      console.error = (...args: any[]) => {
        // hydration 관련 경고 필터링
        const message = args[0]?.toString() || ''
        if (
          message.includes('hydration') ||
          message.includes('user-select') ||
          message.includes('server rendered HTML') ||
          message.includes("didn't match the client properties") ||
          message.includes('A tree hydrated but some attributes')
        ) {
          return // hydration 경고 무시
        }
        originalError.apply(console, args)
      }

      // 컴포넌트 언마운트 시 원래 함수로 복원
      return () => {
        console.error = originalError
      }
    }
  }, [])

  return null // 렌더링하지 않음
}
