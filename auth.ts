
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [Google],
    // 디버깅을 위해 로그 활성화 (개발 환경)
    debug: process.env.NODE_ENV === "development",
    callbacks: {
        async session({ session, token }) {
            // 필요한 경우 세션에 추가 정보 포함
            return session
        },
    },
})
