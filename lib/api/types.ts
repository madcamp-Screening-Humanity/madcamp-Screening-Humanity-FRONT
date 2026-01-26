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
    session_id?: string;
    character_id?: string;
    scenario?: {
        opponent?: string;
        situation?: string;
    };
    // TTS 관련 필드
    tts_enabled?: boolean;
    tts_mode?: "realtime" | "delayed" | "on_click";
    tts_delay_ms?: number;
    tts_streaming_mode?: number;
}

export interface ChatResponse {
    content: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
    };
    session_id?: string;
    audio_url?: string;
    context_summarized?: boolean;
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
    // GPT-SoVITS 파라미터
    streaming_mode?: number; // 0-3
    return_binary?: boolean;
    text_lang?: string;
    prompt_lang?: string;
    media_type?: string; // "wav" | "ogg" | "aac" | "raw"
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
    gender?: string;  // optional - 실제 API 응답에 없을 수 있음
    description?: string;  // optional - 설명 필드
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

// ============ Character API ============
export interface Character {
    id: string;
    name: string;
    description?: string;
    
    // 상세 스펙
    gender?: string;
    species?: string;
    age?: string;
    height?: string;
    job?: string;
    
    // 상세 페르소나
    personality?: string;
    appearance?: string;
    likes?: string[];
    dislikes?: string[];
    speech_style?: string;
    thoughts?: string;
    features?: string;
    habits?: string; // 말버릇
    guidelines?: string;

    // [DEPRECATED in JSON] 저장되지 않으며, 런타임에 buildSystemPersona 함수로 생성됨.
    // 하지만 백엔드 API와의 통신을 위해 타입 정의에는 남겨둠 (optional)
    persona?: string;
    
    voice_id?: string;
    category?: string;
    tags?: string[];
    sample_dialogue?: string;
    image_url?: string;
    is_preset: boolean;
    user_id?: string;
    created_at?: string;
}

export interface PresetCharacter extends Character {
    is_preset: true;
}

export interface CreateCharacterRequest {
    name: string;
    description?: string;
    
    // 상세 스펙
    gender?: string;
    species?: string;
    age?: string;
    height?: string;
    job?: string;
    
    // 상세 페르소나
    personality?: string;
    appearance?: string;
    likes?: string[];
    dislikes?: string[];
    speech_style?: string;
    thoughts?: string;
    features?: string;
    habits?: string;
    guidelines?: string;

    persona?: string;
    
    voice_id?: string;
    category?: string;
    tags?: string[];
    sample_dialogue?: string;
    image_url?: string;
}

export interface UpdateCharacterRequest {
    name?: string;
    description?: string;
    
    // 상세 스펙
    gender?: string;
    species?: string;
    age?: string;
    height?: string;
    job?: string;
    
    // 상세 페르소나
    personality?: string;
    appearance?: string;
    likes?: string[];
    dislikes?: string[];
    speech_style?: string;
    thoughts?: string;
    features?: string;
    habits?: string;
    guidelines?: string;

    persona?: string;
    
    voice_id?: string;
    category?: string;
    tags?: string[];
    sample_dialogue?: string;
    image_url?: string;
}

export interface CharacterResponse {
    characters: Character[];
}

export interface SingleCharacterResponse {
    character: Character;
}
