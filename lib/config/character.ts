/**
 * 캐릭터 관련 설정
 */

// Gemini API 설정
export const GEMINI_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_GEMINI_API_URL || 
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
}

// 캐릭터 미리보기 설정
export const CHARACTER_PREVIEW = {
  DEFAULT_TEXT: process.env.NEXT_PUBLIC_CHARACTER_PREVIEW_TEXT || 
    "안녕하세요! 만나서 반가워요.",
}

// 레이아웃 설정
export const CHARACTER_LAYOUT = {
  // 그리드 레이아웃 (반응형)
  GRID_COLS: {
    mobile: 1,    // 모바일: 1열
    tablet: 2,   // 태블릿: 2열
    desktop: 3,  // 데스크톱: 3열
  },
  
  // 모달 크기
  MODAL_SIZE: {
    small: "sm:max-w-md",      // 작은 모달
    medium: "sm:max-w-lg",     // 중간 모달 (기본)
    large: "sm:max-w-2xl",     // 큰 모달 (위저드)
    fullscreen: "sm:max-w-full", // 전체 화면
  },
  
  // 카드 레이아웃
  CARD: {
    aspectRatio: "aspect-square", // 카드 비율
    showSampleDialogue: true,      // 샘플 대화 표시 여부
  },
}

// 이미지 Fallback 설정
export const IMAGE_FALLBACK = {
  CHARACTER_PLACEHOLDER: "/placeholder.svg",
  CATEGORY_PLACEHOLDERS: {
    애니메이션: "/images/characters/category/animation.jpg",
    소설: "/images/characters/category/novel.jpg",
    영화: "/images/characters/category/movie.jpg",
    기본: "/placeholder.svg",
  },
}
