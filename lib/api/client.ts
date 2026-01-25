import type {
    ApiResponse,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    TTSRequest,
    TTSResponse,
    Voice,
    GenerationResponse,
    GenerationStatus,
    StyleTransferResponse,
    StyleTransferStatus,
    AnimationsResponse,
    StoryRequest,
    StoryResponse,
    SystemStatus,
} from './types';

// API Base URL - 환경변수에서 가져오거나 기본값 사용
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// API 경로 통일: Backend와 동일하게 `/api` 사용
const API_V1 = `${API_BASE_URL}/api`;

// ============ 유틸리티 함수 ============
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: { code: 'NETWORK_ERROR', message: response.statusText }
        }));
        return error;
    }
    return response.json();
}

// ============ Chat API ============
export const chatApi = {
    /**
     * LLM 채팅 요청
     */
    async chat(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
        const response = await fetch(`${API_V1}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',  // 쿠키 자동 전달
            body: JSON.stringify(request),
        });
        return handleResponse<ChatResponse>(response);
    },

    /**
     * 사용 가능한 모델 목록 조회
     */
    async listModels(): Promise<ApiResponse<{ models: ModelInfo[] }>> {
        const response = await fetch(`${API_V1}/chat/models`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse(response);
    },
};

// ============ TTS API ============
export const ttsApi = {
    /**
     * Text-to-Speech 생성
     */
    async generateSpeech(request: TTSRequest): Promise<ApiResponse<TTSResponse>> {
        const response = await fetch(`${API_V1}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',  // 쿠키 자동 전달
            body: JSON.stringify(request),
        });
        return handleResponse<TTSResponse>(response);
    },

    /**
     * 사용 가능한 음성 목록 조회
     */
    async listVoices(): Promise<ApiResponse<{ voices: Voice[] }>> {
        const response = await fetch(`${API_V1}/tts/voices`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse(response);
    },

    /**
     * 오디오 URL을 절대 경로로 변환
     */
    getAudioUrl(audioPath: string): string {
        if (audioPath.startsWith('http')) return audioPath;
        return `${API_BASE_URL}${audioPath}`;
    },
};

// ============ Generation API ============
export const generationApi = {
    /**
     * 3D 캐릭터 생성 시작
     */
    async generateCharacter(
        image: File,
        styleTransfer: boolean = true
    ): Promise<ApiResponse<GenerationResponse>> {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('style_transfer', String(styleTransfer));

        const response = await fetch(`${API_V1}/generate`, {
            method: 'POST',
            credentials: 'include',  // 쿠키 자동 전달
            body: formData,
        });
        return handleResponse<GenerationResponse>(response);
    },

    /**
     * 생성 상태 조회
     */
    async getStatus(jobId: string): Promise<ApiResponse<GenerationStatus>> {
        const response = await fetch(`${API_V1}/generate/status/${jobId}`);
        return handleResponse<GenerationStatus>(response);
    },

    /**
     * 생성 완료까지 폴링 (주기적으로 상태 확인)
     */
    async pollUntilComplete(
        jobId: string,
        onProgress?: (status: GenerationStatus) => void,
        intervalMs: number = 2000
    ): Promise<ApiResponse<GenerationStatus>> {
        return new Promise((resolve) => {
            const poll = async () => {
                const result = await this.getStatus(jobId);

                if (result.success && result.data) {
                    onProgress?.(result.data);

                    if (result.data.status === 'completed' || result.data.status === 'failed') {
                        resolve(result);
                        return;
                    }
                }

                setTimeout(poll, intervalMs);
            };

            poll();
        });
    },

    /**
     * 결과 URL을 절대 경로로 변환
     */
    getResultUrl(resultPath: string): string {
        if (resultPath.startsWith('http')) return resultPath;
        return `${API_BASE_URL}${resultPath}`;
    },
};

// ============ Style Transfer API ============
export const styleApi = {
    /**
     * 스타일 변환 시작
     */
    async transformStyle(
        image: File,
        stylePreset: string = 'anime',
        strength: number = 0.8
    ): Promise<ApiResponse<StyleTransferResponse>> {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('style_preset', stylePreset);
        formData.append('strength', String(strength));

        const response = await fetch(`${API_V1}/style/transform`, {
            method: 'POST',
            credentials: 'include',  // 쿠키 자동 전달
            body: formData,
        });
        return handleResponse<StyleTransferResponse>(response);
    },

    /**
     * 변환 상태 조회
     */
    async getStatus(jobId: string): Promise<ApiResponse<StyleTransferStatus>> {
        const response = await fetch(`${API_V1}/style/status/${jobId}`);
        return handleResponse<StyleTransferStatus>(response);
    },

    /**
     * 변환 완료까지 폴링
     */
    async pollUntilComplete(
        jobId: string,
        onProgress?: (status: StyleTransferStatus) => void,
        intervalMs: number = 2000
    ): Promise<ApiResponse<StyleTransferStatus>> {
        return new Promise((resolve) => {
            const poll = async () => {
                const result = await this.getStatus(jobId);

                if (result.success && result.data) {
                    onProgress?.(result.data);

                    if (result.data.status === 'completed' || result.data.status === 'failed') {
                        resolve(result);
                        return;
                    }
                }

                setTimeout(poll, intervalMs);
            };

            poll();
        });
    },
};

// ============ Animation API ============
export const animationApi = {
    /**
     * 사용 가능한 애니메이션 목록 조회
     */
    async listAnimations(): Promise<ApiResponse<AnimationsResponse>> {
        const response = await fetch(`${API_V1}/animations`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse<AnimationsResponse>(response);
    },

    /**
     * 애니메이션 URL을 절대 경로로 변환
     */
    getAnimationUrl(animationPath: string): string {
        if (animationPath.startsWith('http')) return animationPath;
        return `${API_BASE_URL}${animationPath}`;
    },
};

// ============ Story API ============
export const storyApi = {
    /**
     * 스토리 생성
     */
    async generateStory(request: StoryRequest): Promise<ApiResponse<StoryResponse>> {
        const response = await fetch(`${API_V1}/story/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',  // 쿠키 자동 전달
            body: JSON.stringify(request),
        });
        return handleResponse<StoryResponse>(response);
    },
};

// ============ System API ============
export const systemApi = {
    /**
     * 시스템 상태 조회
     */
    async getStatus(): Promise<ApiResponse<SystemStatus>> {
        const response = await fetch(`${API_V1}/system/status`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse<SystemStatus>(response);
    },

    /**
     * 헬스 체크
     */
    async healthCheck(): Promise<ApiResponse<{ status: string }>> {
        const response = await fetch(`${API_V1}/system/health`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse(response);
    },
};

// ============ 통합 API 객체 ============
export const api = {
    chat: chatApi,
    tts: ttsApi,
    generation: generationApi,
    style: styleApi,
    animation: animationApi,
    story: storyApi,
    system: systemApi,
};

export default api;
