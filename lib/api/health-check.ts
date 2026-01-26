/**
 * 백엔드 서버 연결 상태 확인 유틸리티
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface HealthCheckResult {
  isConnected: boolean;
  message: string;
  url?: string;
  error?: string;
}

/**
 * 백엔드 서버 연결 상태 확인
 */
export async function checkBackendHealth(): Promise<HealthCheckResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
    
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      credentials: 'include',  // 쿠키 포함 (CORS 요청)
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return {
        isConnected: true,
        message: '백엔드 서버에 정상적으로 연결되었습니다.',
        url: API_BASE_URL,
      };
    } else {
      return {
        isConnected: false,
        message: `백엔드 서버 응답 오류: ${response.status} ${response.statusText}`,
        url: API_BASE_URL,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isConnected: false,
          message: '백엔드 서버 응답 시간 초과 (5초)',
          url: API_BASE_URL,
          error: 'TIMEOUT',
        };
      }
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        return {
          isConnected: false,
          message: `백엔드 서버에 연결할 수 없습니다: ${API_BASE_URL}`,
          url: API_BASE_URL,
          error: 'NETWORK_ERROR',
        };
      }
    }
    return {
      isConnected: false,
      message: `연결 확인 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      url: API_BASE_URL,
      error: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * 백엔드 서버 연결 상태를 콘솔에 출력
 */
export async function logBackendHealth(): Promise<void> {
  const result = await checkBackendHealth();
  if (result.isConnected) {
    console.log('✅', result.message, `(${result.url})`);
  } else {
    console.error('❌', result.message);
    console.error('확인 사항:');
    console.error('1. 백엔드 서버가 실행 중인지 확인:', result.url);
    console.error('2. 포트가 올바른지 확인 (기본값: 8000)');
    console.error('3. 방화벽 설정 확인');
    console.error('4. 브라우저 콘솔의 네트워크 탭에서 요청 상태 확인');
  }
}
