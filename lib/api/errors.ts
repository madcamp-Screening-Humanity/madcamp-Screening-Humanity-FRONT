/**
 * 공통 에러 타입 및 메시지 정의
 */

export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

/**
 * 에러 메시지 상수
 */
export const ERROR_MESSAGES = {
  [ErrorCode.NETWORK_ERROR]: "네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.",
  [ErrorCode.API_ERROR]: "API 호출 중 오류가 발생했습니다.",
  [ErrorCode.VALIDATION_ERROR]: "입력값이 올바르지 않습니다.",
  [ErrorCode.UNAUTHORIZED]: "인증이 필요합니다. 다시 로그인해주세요.",
  [ErrorCode.NOT_FOUND]: "요청한 리소스를 찾을 수 없습니다.",
  [ErrorCode.SERVER_ERROR]: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  [ErrorCode.UNKNOWN_ERROR]: "알 수 없는 오류가 발생했습니다.",
} as const

/**
 * 에러를 AppError로 변환
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    // 네트워크 에러 감지
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR],
        details: error.message,
      }
    }
    
    // API 에러 감지
    if (error.message.includes("API") || error.message.includes("호출")) {
      return {
        code: ErrorCode.API_ERROR,
        message: error.message || ERROR_MESSAGES[ErrorCode.API_ERROR],
        details: error.message,
      }
    }
    
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
      details: error.message,
    }
  }
  
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
    details: String(error),
  }
}

/**
 * 에러 메시지 가져오기
 */
export function getErrorMessage(error: unknown): string {
  const appError = toAppError(error)
  return appError.message
}
