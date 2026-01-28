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
    VoiceLinkOption,
    ServerFilesResponse,
    ModelMakeUploadResponse,
    ModelMakeStartRequest,
    ModelMakeRegisterRequest,
    ModelMakeMyResponse,
    GenerationResponse,
    GenerationStatus,
    StyleTransferResponse,
    StyleTransferStatus,
    AnimationsResponse,
    StoryRequest,
    StoryResponse,
    SystemStatusResponse,
    DetailedSystemStatus,
    Character,
    CharacterResponse,
    CreateCharacterRequest,
    UpdateCharacterRequest,
    AdminCharacterListItem,
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
                credentials: 'include',  // 쿠키 전달 (get_current_user_optional, 비로그인 시 None)
                body: JSON.stringify({
                    messages: request.messages,
                    model: request.model || 'gemma-3-27b',
                    temperature: request.temperature || 0.7,
                    max_tokens: request.max_tokens || 512,
                    persona: request.persona,
                    scenario: request.scenario,
                    session_id: request.session_id,
                    character_id: request.character_id,
                    tts_enabled: request.tts_enabled,
                    tts_mode: request.tts_mode,
                    tts_delay_ms: request.tts_delay_ms,
                    tts_streaming_mode: request.tts_streaming_mode,
                    tts_speed: request.tts_speed,
                    director_note: request.director_note,
                    current_speaker: request.current_speaker,
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
     * 추천 대사 생성 요청
     */
    async getRecommendation(request: {
        messages: any[];
        scenario?: any;
        character_name: string;
        user_name?: string;
    }): Promise<ApiResponse<string[]>> {
        const response = await fetch(`${API_V1}/chat/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<string[]>(response);
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

    /**
     * SSE 스트리밍 채팅 요청
     * 실시간으로 청크 단위 응답을 받아 체감 속도 향상
     * @param request 채팅 요청 데이터
     * @param onChunk 각 청크 수신 시 호출되는 콜백
     * @param onComplete 전체 응답 완료 시 호출되는 콜백
     * @param onError 오류 발생 시 호출되는 콜백
     */
    async chatStream(
        request: ChatRequest,
        onChunk: (text: string) => void,
        onComplete: (fullText: string, sessionId?: string) => void,
        onError?: (error: Error) => void
    ): Promise<void> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const response = await fetch(`${API_V1}/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    messages: request.messages,
                    model: request.model || 'gemini-2.5-flash',
                    temperature: request.temperature || 0.7,
                    max_tokens: request.max_tokens || 512,
                    persona: request.persona,
                    scenario: request.scenario,
                    session_id: request.session_id,
                    character_id: request.character_id,
                    director_note: request.director_note,
                    current_speaker: request.current_speaker,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('ReadableStream을 지원하지 않는 브라우저입니다.');
            }

            const decoder = new TextDecoder();
            let fullText = '';
            let sessionId: string | undefined;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.done) {
                                // 완료 시 전체 텍스트와 세션 ID 반환
                                sessionId = data.session_id;
                                if (data.full_content) {
                                    fullText = data.full_content;
                                }
                            } else if (data.content) {
                                // 청크 수신
                                fullText += data.content;
                                onChunk(data.content);
                            }
                        } catch (e) {
                            // JSON 파싱 실패 시 무시 (불완전한 청크)
                            if (!(e instanceof SyntaxError)) {
                                throw e;
                            }
                        }
                    }
                }
            }

            onComplete(fullText, sessionId);

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    onError?.(new Error('스트리밍 요청 시간이 초과되었습니다. (180초)'));
                } else {
                    onError?.(error);
                }
            } else {
                onError?.(new Error('알 수 없는 오류가 발생했습니다.'));
            }
        }
    },
};

// ============ TTS API ============
export const ttsApi = {
    /**
     * TTS 모델 가중치 미리 로드 (채팅 준비)
     * @param voiceId 음성 ID
     */
    async prepareTTS(voiceId: string): Promise<ApiResponse<{ message: string }>> {
        const response = await fetch(`${API_V1}/tts/prepare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ voice_id: voiceId }),
        });
        return handleResponse<{ message: string }>(response);
    },

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

    /** 캐릭터 voice_id 선택용 (내 Voice + 시스템 Voice) */
    async getVoiceLinkOptions(): Promise<ApiResponse<VoiceLinkOption[]>> {
        const response = await fetch(`${API_V1}/voices/link-options`, { credentials: 'include' });
        return handleResponse<VoiceLinkOption[]>(response);
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
     * 훈련 데이터(train_voice) 오디오 파일 업로드 (관리자 전용).
     * .wav, .mp3, .flac, .ogg만 허용.
     */
    async uploadTrainVoiceFile(
        file: File,
        subPath: string
    ): Promise<ApiResponse<{ filename: string; path: string; size_bytes: number }>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sub_path', subPath);
        const response = await fetch(`${API_V1}/voices/server-files/upload`, {
            method: 'POST',
            body: formData,
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

    /**
     * 학습 시작 (관리자 전용)
     */
    async startTraining(request: import('./types').TrainStartRequest): Promise<ApiResponse<import('./types').TrainingStatus>> {
        const response = await fetch(`${API_V1}/voices/train/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse(response);
    },

    /**
     * 학습 상태 조회
     */
    async getTrainingStatus(modelName: string): Promise<ApiResponse<import('./types').TrainingStatus>> {
        const response = await fetch(`${API_V1}/voices/train/status/${modelName}`, {
            credentials: 'include',
        });
        return handleResponse(response);
    },

    /**
     * 학습 로그 조회
     */
    async getTrainingLog(modelName: string): Promise<ApiResponse<import('./types').TrainingLog>> {
        const response = await fetch(`${API_V1}/voices/train/log/${modelName}`, {
            credentials: 'include',
        });
        return handleResponse(response);
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
    async getStatus(): Promise<ApiResponse<import('./types').SystemStatusResponse>> {
        const response = await fetch(`${API_V1}/system/status`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse<import('./types').SystemStatusResponse>(response);
    },

    /**
     * 헬스 체크 (상세)
     */
    async getDetailedHealth(): Promise<ApiResponse<import('./types').SystemStatusResponse>> {
        const response = await fetch(`${API_V1}/system/health/detailed`, {
            credentials: 'include',
        });
        return handleResponse(response);
    },

    /**
     * 헬스 체크 (간단)
     */
    async healthCheck(): Promise<ApiResponse<{ status: string }>> {
        const response = await fetch(`${API_V1}/system/health`, {
            credentials: 'include',  // 쿠키 자동 전달
        });
        return handleResponse(response);
    },
};

// ============ Users / Settings API (GET/PUT /api/users/me/settings) ============
export const settingsApi = {
    /** 로그인 사용자 설정 조회. 비로그인 시 401. */
    async getMySettings(): Promise<ApiResponse<Record<string, unknown>>> {
        const response = await fetch(`${API_V1}/users/me/settings`, { credentials: 'include' });
        return handleResponse<Record<string, unknown>>(response);
    },
    /** 로그인 사용자 설정 부분 업데이트 (tts_mode, tts_delay_ms, tts_streaming_mode, tts_enabled, tts_speed). */
    async putMySettings(body: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
        const response = await fetch(`${API_V1}/users/me/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        });
        return handleResponse<Record<string, unknown>>(response);
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

    /** 내 캐릭터 페르소나 목록 (user_id=me) */
    async listMyCharacters(): Promise<ApiResponse<CharacterResponse>> {
        const response = await fetch(`${API_V1}/characters/my`, { credentials: 'include' });
        return handleResponse<CharacterResponse>(response);
    },

    /** 관리자: DB+Preset 캐릭터 통합 목록 (캐릭터–Voice 연결/교체용) */
    async listAdminCharacters(): Promise<ApiResponse<{ characters: AdminCharacterListItem[] }>> {
        const response = await fetch(`${API_V1}/characters/admin/all`, { credentials: 'include' });
        return handleResponse<{ characters: AdminCharacterListItem[] }>(response);
    },

    /** 관리자: 캐릭터 voice_id만 수정 (null=연결 해제) */
    async updateCharacterVoice(
        characterId: string,
        voiceId: string | null
    ): Promise<ApiResponse<{ id: string; name: string; voice_id: string | null }>> {
        const response = await fetch(`${API_V1}/characters/admin/${characterId}/voice`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ voice_id: voiceId }),
        });
        return handleResponse<{ id: string; name: string; voice_id: string | null }>(response);
    },
    /** 내 캐릭터 생성 */
    async createMyCharacter(request: CreateCharacterRequest): Promise<ApiResponse<Character>> {
        const response = await fetch(`${API_V1}/characters/my`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<Character>(response);
    },

    /**
     * 캐릭터 상세 설정 자동 생성 (AI)
     * Backend API (/generate/character-details)를 호출하여 Gemini/Ollama Fallback 적용
     */
    async generateCharacterDetails(request: CreateCharacterRequest): Promise<ApiResponse<import('./types').CharacterGenerationResponse>> {
        const response = await fetch(`${API_V1}/generate/character-details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        return handleResponse<import('./types').CharacterGenerationResponse>(response);
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

// ============ Model Make API ============
export const modelMakeApi = {
    async upload(files: File[]): Promise<ApiResponse<ModelMakeUploadResponse>> {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        const res = await fetch(`${API_V1}/model-make/upload`, { method: 'POST', body: form, credentials: 'include' });
        return handleResponse<ModelMakeUploadResponse>(res);
    },
    async start(body: ModelMakeStartRequest): Promise<ApiResponse<unknown>> {
        const res = await fetch(`${API_V1}/model-make/start`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    async status(modelName: string): Promise<ApiResponse<{ status?: string; progress?: number; message?: string }>> {
        const res = await fetch(`${API_V1}/model-make/status/${encodeURIComponent(modelName)}`, { credentials: 'include' });
        return handleResponse(res);
    },
    async log(modelName: string): Promise<ApiResponse<{ log?: string }>> {
        const res = await fetch(`${API_V1}/model-make/log/${encodeURIComponent(modelName)}`, { credentials: 'include' });
        return handleResponse(res);
    },
    async register(body: ModelMakeRegisterRequest): Promise<ApiResponse<{ voice_id: string; name: string }>> {
        const res = await fetch(`${API_V1}/model-make/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    async my(): Promise<ApiResponse<ModelMakeMyResponse>> {
        const res = await fetch(`${API_V1}/model-make/my`, { credentials: 'include' });
        return handleResponse<ModelMakeMyResponse>(res);
    },
    async deleteMy(voiceId: string): Promise<ApiResponse<{ message: string }>> {
        const res = await fetch(`${API_V1}/model-make/my/${voiceId}`, { method: 'DELETE', credentials: 'include' });
        return handleResponse(res);
    },
    /** 모델 제작 중단(트랜잭션 롤백): train_input_dir·logs·TEMP 삭제. Voice 등록 전 나가기 시 호출 */
    async abort(payload: { train_input_dir: string; model_name?: string }): Promise<ApiResponse<{ message: string }>> {
        const res = await fetch(`${API_V1}/model-make/abort`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        return handleResponse(res);
    },
};

// ============ 통합 API 객체 ============
export const api = {
    chat: chatApi,
    tts: ttsApi,
    voice: voiceApi,

    story: storyApi,
    system: systemApi,
    character: characterApi,
    modelMake: modelMakeApi,
};

export default api;
