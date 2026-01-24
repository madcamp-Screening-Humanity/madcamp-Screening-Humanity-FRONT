// API 타입 정의

// ============ 공통 응답 타입 ============
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

// ============ Chat API ============
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatRequest {
    messages: Message[];
    persona?: string;
    temperature?: number;
    max_tokens?: number;
    model?: string;
}

export interface ChatResponse {
    content: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
    };
}

export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
}

// ============ TTS API ============
export interface TTSRequest {
    text: string;
    voice_id?: string;
    speed?: number;
    language?: string;
}

export interface TTSResponse {
    audio_url: string;
    duration?: number;
    file_id?: string;
    note?: string;
    message?: string;
}

export interface Voice {
    id: string;
    name: string;
    language: string;
    gender: string;
}

// ============ Generation API ============
export interface GenerationRequest {
    image: File;
    style_transfer?: boolean;
}

export interface GenerationResponse {
    job_id: string;
    status_url: string;
    estimated_time: number;
}

export interface GenerationStatus {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    current_step: string;
    result_url?: string;
    error?: string;
}

// ============ Style Transfer API ============
export interface StyleTransferRequest {
    image: File;
    style_preset?: string;
    strength?: number;
}

export interface StyleTransferResponse {
    job_id: string;
    status_url: string;
}

export interface StyleTransferStatus {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    current_step: string;
    result_url?: string;
    error?: string;
}

// ============ Animation API ============
export interface Animation {
    id: string;
    name: string;
    url: string;
}

export interface AnimationsResponse {
    animations: Animation[];
}

// ============ Story API ============
export interface StoryRequest {
    prompt: string;
    length?: 'short' | 'medium' | 'long';
    style?: string;
}

export interface StoryResponse {
    story: string;
    word_count: number;
    chapters: number;
}

// ============ System API ============
export interface SystemStatus {
    status: string;
    mode: string;
    gpu_available: boolean;
    services: {
        [key: string]: {
            status: string;
            url: string;
        };
    };
}
