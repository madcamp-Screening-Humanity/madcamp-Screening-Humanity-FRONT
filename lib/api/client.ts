import type {
    ApiResponse,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    TTSRequest,
    TTSResponse,
    Voice,
    VoiceDetail,
    VoiceCreateRequest,
    VoiceUpdateRequest,
    VoiceListResponse,
    VoiceTestResponse,
    ServerFilesResponse, // NEW
    GenerationResponse,
    GenerationStatus,
    StyleTransferResponse,
    StyleTransferStatus,
    AnimationsResponse,
    StoryRequest,
    StoryResponse,
    SystemStatus,
    Character,
    CharacterResponse,
    CreateCharacterRequest,
    UpdateCharacterRequest,
} from './types';

// API Base URL - 환경변수에서 가져오거나 기본값 사용
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// API 경로: 많은 문서에서 /api로 통일된 상태이므로 /api 시도 (v1에서 404 발생 시)
const API_V1 = `${API_BASE_URL}/api`;

// ============ 유틸리티 함수 ============
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            error: { code: 'NETWORK_ERROR', message: response.statusText }
        }));
        // 에러 응답에도 success: false 포함
        return {
            success: false,
            error: errorData.error || errorData.detail ? {
                code: errorData.error?.code || 'API_ERROR',
                message: errorData.error?.message || errorData.detail || response.statusText
            } : {
                code: 'NETWORK_ERROR',
                message: response.statusText
            }
        };
    }
    const data = await response.json();
    // 성공 응답에 success가 없으면 추가
    if (data.success === undefined) {
        return {
            success: true,
            data: data.data || data
        };
    }
    return data;
}

// ============ Chat API ============
export const chatApi = {
    /**
     * LLM 채팅 요청 (인증 없음)
     * 타임아웃: 180초 (Ollama 응답이 30-60초 걸릴 수 있으므로 여유있게 설정)
     */
    async chat(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 180초 타임아웃 (3분)

            // 인증 없이 사용 (/api/chat)
            // persona, scenario 등 모든 필드 전달
            const response = await fetch(`${API_V1}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: request.messages,
                    model: request.model || 'gemma-3-27b-it',
                    temperature: request.temperature || 0.7,
                    max_tokens: request.max_tokens || 512,
                    persona: request.persona,  // 페르소나 전달
                    scenario: request.scenario,  // 시나리오 정보 전달
                    session_id: request.session_id,
                    character_id: request.character_id,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return handleResponse<ChatResponse>(response);
        } catch (error) {
            // 타임아웃 또는 네트워크 오류 처리
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        error: {
                            code: 'TIMEOUT_ERROR',
                            message: '요청 시간이 초과되었습니다. (180초)\n\nOllama API 응답이 느릴 수 있습니다. 잠시 후 다시 시도해주세요.'
                        }
                    };
                }
                // 네트워크 오류 (Failed to fetch, NetworkError 등)
                // TypeError는 네트워크 연결 실패를 의미할 수 있음
                if (error.name === 'TypeError') {
                    // fetch가 실패한 경우 (서버가 실행되지 않음)
                    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                        return {
                            success: false,
                            error: {
                                code: 'NETWORK_ERROR',
                                message: `백엔드 서버에 연결할 수 없습니다. (${API_BASE_URL})\n\n확인 사항:\n1. 백엔드 서버가 실행 중인지 확인 (http://localhost:8000)\n2. 브라우저 콘솔에서 네트워크 탭 확인\n3. 방화벽 설정 확인`
                            }
                        };
                    }
                }
                // 기타 네트워크 관련 오류
                if (error.message.includes('network') || error.message.includes('NetworkError')) {
                    return {
                        success: false,
                        error: {
                            code: 'NETWORK_ERROR',
                            message: `네트워크 오류가 발생했습니다. (${API_BASE_URL})\n\n백엔드 서버가 실행 중인지 확인하세요.`
                        }
                    };
                }
            }
            // 기타 에러는 그대로 throw
            throw error;
        }
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

// ============ Voice API (관리자) ============
export const voiceApi = {
    /**
     * 음성 목록 조회 (활성화된 음성만)
     */
    async listVoices(activeOnly: boolean = true): Promise<ApiResponse<VoiceListResponse>> {
        const response = await fetch(`${API_V1}/voices?active_only=${activeOnly}`, {
            credentials: 'include',
        });
        return handleResponse<VoiceListResponse>(response);
    },

    /**
     * 특정 음성 조회
     */
    async getVoice(voiceId: string): Promise<ApiResponse<VoiceDetail>> {
        const response = await fetch(`${API_V1}/voices/${voiceId}`, {
            credentials: 'include',
        });
        return handleResponse<VoiceDetail>(response);
    },

    /**
     * 음성 생성 (관리자 전용)
     */
    async createVoice(request: VoiceCreateRequest): Promise<ApiResponse<VoiceDetail>> {
        const response = await fetch(`${API_V1}/voices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<VoiceDetail>(response);
    },

    /**
     * 음성 수정 (관리자 전용)
     */
    async updateVoice(voiceId: string, request: VoiceUpdateRequest): Promise<ApiResponse<VoiceDetail>> {
        const response = await fetch(`${API_V1}/voices/${voiceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<VoiceDetail>(response);
    },

    /**
     * 음성 삭제 (관리자 전용)
     */
    async deleteVoice(voiceId: string, permanent: boolean = false): Promise<ApiResponse<{ message: string }>> {
        const response = await fetch(`${API_V1}/voices/${voiceId}?permanent=${permanent}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        return handleResponse<{ message: string }>(response);
    },

    /**
     * 음성 테스트 (TTS 생성)
     */
    async testVoice(voiceId: string, text: string = "안녕하세요, 반갑습니다."): Promise<ApiResponse<VoiceTestResponse>> {
        const response = await fetch(`${API_V1}/voices/${voiceId}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text }),
        });
        return handleResponse<VoiceTestResponse>(response);
    },

    /**
     * Base64 오디오를 재생 가능한 URL로 변환
     */
    base64ToAudioUrl(base64: string, format: string = 'wav'): string {
        return `data:audio/${format};base64,${base64}`;
    },

    /**
     * Server A 파일 목록 조회 (관리자 전용)
     */
    async getServerFiles(): Promise<ApiResponse<ServerFilesResponse>> {
        const response = await fetch(`${API_V1}/voices/server-files`, {
            credentials: 'include',
        });
        return handleResponse<ServerFilesResponse>(response);
    },

    /**
     * Server A 파일 업로드 (관리자 전용)
     */
    async uploadServerFile(
        file: File,
        category: 'ref_audio' | 'train_voice' | 'gpt_weights' | 'sovits_weights',
        subPath?: string,
        modelVersion: string = 'v2'
    ): Promise<ApiResponse<{ filename: string; path: string; size_bytes: number }>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        if (subPath) formData.append('sub_path', subPath);
        formData.append('model_version', modelVersion);

        // 타임아웃 처리는 브라우저 기본값(보통 300초)을 따름
        const response = await fetch(`${API_V1}/voices/server-files/upload`, {
            method: 'POST',
            body: formData, // Content-Type은 자동 설정됨
            credentials: 'include',
        });
        return handleResponse(response);
    },

    /**
     * Server A 파일 삭제 (관리자 전용)
     */
    async deleteServerFile(path: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
        const response = await fetch(`${API_V1}/voices/server-files?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        return handleResponse(response);
    },

    /**
     * Server A 훈련 폴더 생성 (관리자 전용)
     */
    async createServerFolder(path: string): Promise<ApiResponse<{ success: boolean; path: string }>> {
        const formData = new FormData();
        formData.append('path', path);

        const response = await fetch(`${API_V1}/voices/server-files/mkdir`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
        return handleResponse(response);
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
     * 상황 분석 및 스토리 생성
     * 경로: /ai/generate/story (브랜치 반영), 감독 모드 파라미터 유지
     */
    async analyzeSituation(request: {
        mode: "director" | "actor";
        situation: string;
        // 주연 모드용
        opponent_name?: string;
        character_persona?: string;
        // 감독 모드용
        character1_name?: string;
        character1_persona?: string;
        character2_name?: string;
        character2_persona?: string;
    }): Promise<ApiResponse<{ plot: string }>> {
        const response = await fetch(`${API_V1}/ai/generate/story`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<{ plot: string }>(response);
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

// ============ Character API ============
// 타임아웃을 가진 fetch 래퍼
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        // AbortError는 타임아웃
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('요청 시간이 초과되었습니다.');
        }
        // 네트워크 에러 (Failed to fetch 등)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(`네트워크 오류: 백엔드 서버에 연결할 수 없습니다. (${url})`);
        }
        // 기타 에러는 그대로 throw
        throw error;
    }
}

export const characterApi = {
    /**
     * 사전설정 캐릭터 목록 조회
     * Next.js API Route (/api/characters)에서 public/characters/*.json 동적 로드
     */
    async listPresets(): Promise<ApiResponse<CharacterResponse>> {
        try {
            // Next.js API Route 호출 (파일 시스템에서 동적으로 로드)
            const response = await fetch('/api/characters', {
                method: 'GET',
                cache: 'no-cache',
            });

            return handleResponse<CharacterResponse>(response);
        } catch (error) {
            console.error("listPresets fetch error:", error);
            // 에러 발생 시에도 빈 배열 반환
            return {
                success: true,
                data: {
                    characters: []
                }
            };
        }
    },

    /**
     * 사용자가 생성한 캐릭터 목록 조회
     */
    async listUserCharacters(): Promise<ApiResponse<CharacterResponse>> {
        try {
            const response = await fetchWithTimeout(`${API_V1}/characters`, {
                credentials: 'include',
            }, 10000);
            return handleResponse<CharacterResponse>(response);
        } catch (error) {
            console.error("listUserCharacters fetch error:", error);
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.'
                }
            };
        }
    },

    /**
     * AI를 사용하여 캐릭터 상세 정보 자동 생성
     */
    async generateCharacterDetails(request: {
        name: string;
        description?: string;
        category?: string;
    }): Promise<ApiResponse<Partial<Character>>> {
        const response = await fetch(`${API_V1}/characters/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<Partial<Character>>(response);
    },

    /**
     * 캐릭터 생성
     */
    async createCharacter(request: CreateCharacterRequest): Promise<ApiResponse<Character>> {
        const response = await fetch(`${API_V1}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<Character>(response);
    },

    /**
     * 특정 캐릭터 조회
     */
    async getCharacter(characterId: string): Promise<ApiResponse<Character>> {
        const response = await fetch(`${API_V1}/characters/${characterId}`, {
            credentials: 'include',
        });
        return handleResponse<Character>(response);
    },

    /**
     * 캐릭터 수정
     */
    async updateCharacter(
        characterId: string,
        request: UpdateCharacterRequest
    ): Promise<ApiResponse<Character>> {
        const response = await fetch(`${API_V1}/characters/${characterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<Character>(response);
    },

    /**
     * 캐릭터 삭제
     */
    async deleteCharacter(characterId: string): Promise<ApiResponse<{ message: string }>> {
        const response = await fetch(`${API_V1}/characters/${characterId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        return handleResponse<{ message: string }>(response);
    },
};

// ============ 통합 API 객체 ============
export const api = {
    chat: chatApi,
    tts: ttsApi,
    voice: voiceApi,
    generation: generationApi,
    style: styleApi,
    animation: animationApi,
    story: storyApi,
    system: systemApi,
    character: characterApi,
};

export default api;
