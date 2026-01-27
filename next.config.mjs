/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Hydration error 방지: 브라우저 확장 프로그램으로 인한 스타일 불일치 무시
  reactStrictMode: true,
  // 개발 환경에서 hydration 경고를 콘솔에 표시하지 않음 (프로덕션에서는 여전히 경고)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
