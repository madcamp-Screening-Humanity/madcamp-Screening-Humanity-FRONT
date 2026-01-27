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
        background?: string;
    };
    // TTS 관련 필드
    tts_enabled?: boolean;
    tts_mode?: "realtime" | "delayed" | "on_click";
    tts_delay_ms?: number;
    tts_streaming_mode?: number;
    tts_speed?: number;  // 발화 속도 (1.0=정속, 0.5~2.0)
    // 감독 중재 필드
    director_note?: string;
    current_speaker?: string;  // 현재 말할 캐릭터 (감독 모드용)
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
    streaming_mode?: number;  // 0-3
    return_binary?: boolean;
    text_lang?: string;
    prompt_lang?: string;
    media_type?: string;  // "wav" | "ogg" | "aac" | "raw"
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
    gender?: string;       // optional - 실제 API 응답에 없을 수 있음
    description?: string;  // optional - 설명 필드
}

// 관리자용 음성 상세 정보
export interface VoiceDetail extends Voice {
    ref_audio_path: string;
    prompt_text?: string;
    prompt_lang: string;
    gpt_weights_path?: string;
    sovits_weights_path?: string;
    model_version?: string;
    train_voice_folder?: string;
    train_input_dir?: string | null;   // 모델 제작 업로드 경로
    training_model_name?: string | null;  // 학습 model_name
    is_default: boolean;
    is_active: boolean;
    user_id?: string | null;  // 소유자 (null=시스템)
    created_at?: string;
    updated_at?: string;
}

// 캐릭터 voice_id 선택용 (DB Voice만, gpt/sovits 1쌍)
export interface VoiceLinkOption {
    id: string;
    name: string;
    gpt_weights_path?: string;
    sovits_weights_path?: string;
}

// 음성 생성 요청
export interface VoiceCreateRequest {
    name: string;
    description?: string;
    language?: string;
    ref_audio_path: string;
    prompt_text?: string;
    prompt_lang?: string;
    gpt_weights_path?: string;
    sovits_weights_path?: string;
    model_version?: string;
    train_voice_folder?: string;
    train_input_dir?: string;
    training_model_name?: string;
    is_default?: boolean;
    is_active?: boolean;
}

// 음성 수정 요청
export interface VoiceUpdateRequest {
    name?: string;
    description?: string;
    language?: string;
    ref_audio_path?: string;
    prompt_text?: string;
    prompt_lang?: string;
    gpt_weights_path?: string;
    sovits_weights_path?: string;
    model_version?: string;
    train_voice_folder?: string;
    is_default?: boolean;
    is_active?: boolean;
}

// 음성 목록 응답
export interface VoiceListResponse {
    voices: VoiceDetail[];
    total: number;
}

// 음성 테스트 응답
export interface VoiceTestResponse {
    audio_base64: string;
    format: string;
    voice_id: string;
    voice_name: string;
    text: string;
}

// Server A 파일 목록 응답
export interface FileInfo {
    name: string;
    stem: string;
    path: string;
    size_bytes: number;
    size_mb: number;
    modified_at: string;
}

export interface TrainVoiceFile {
    name: string;
    size_bytes: number;
    size_mb?: number;
}

export interface TrainVoiceInfo {
    character_name: string;
    path: string;
    file_count: number;
    files?: TrainVoiceFile[];
    total_size_mb: number;
    status: string;
}

export interface ServerFilesResponse {
    models: {
        gpt: Record<string, FileInfo[]>;
        sovits: Record<string, FileInfo[]>;
        summary?: {
            gpt_total: number;
            sovits_total: number;
        };
    };
    train_voices: {
        voices: TrainVoiceInfo[];
        total: number;
        base_path?: string;
    };
    /** logs/{model_name} 내 .ckpt/.pth (연관 gpt/sovits 후보) */
    logs?: {
        models: { model_name: string; gpt_path: string | null; sovits_path: string | null }[];
    };
}

// ============ Training API ============
export interface TrainStartRequest {
    model_name: string;
    upload_path: string; // Server A 내부 경로 (ex: /opt/GPT-SoVITS/ref_audio/char1)
    version?: string;    // v2, v2Pro, etc. (Default: v2)
    batch_size?: number; // Default: 11 (depends on VRAM)
    total_epochs?: number; 
    save_every_epoch?: number;
    gpu_numbers?: string; // "0-0"
    dry_run?: boolean;   // Test mode
}

export interface TrainingStatus {
    model_name: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number; // 0.0 ~ 1.0
    message: string;
    created_at?: string;
    updated_at?: string;
}

export interface TrainingLog {
    model_name: string;
    log: string; // Full log content
}

// ============ Model Make API ============
export interface ModelMakeUploadResponse {
    success: boolean;
    train_input_dir: string;
    first_file: string;
}

export interface ModelMakeStartRequest {
    model_name: string;
    train_input_dir: string;
    version?: string;
}

export interface ModelMakeRegisterRequest {
    model_name: string;
    voice_name: string;
    train_input_dir: string;
    ref_audio_file: string;
    gpt_weights_path?: string;
    sovits_weights_path?: string;
}

export interface ModelMakeMyVoice {
    id: string;
    name: string;
    train_input_dir?: string | null;
    training_model_name?: string | null;
    created_at?: string | null;
}

export interface ModelMakeMyResponse {
    success: boolean;
    voices: ModelMakeMyVoice[];
    total: number;
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
export interface DetailedSystemStatus {
    timestamp: number;
    services: {
        [key: string]: {
            name: string;
            status: "online" | "offline" | "error";
            latency: number;
            url: string;
            message?: string;
        };
    };
}

export interface SystemStatusResponse {
    success: boolean;
    timestamp: number;
    services: {
        [key: string]: {
            name: string;
            status: "online" | "offline" | "error";
            latency: number;
            url: string;
            message?: string;
        };
    };
}

// ============ Character API ============
// 캐릭터 인터페이스 - 상세 필드 지원
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
    habits?: string;      // 말버릇
    guidelines?: string;
    worldview?: string;   // 세계관 (신규)
    source_work?: string; // 출처/작품 (선택, preset JSON 등)

    // [DEPRECATED in JSON] 저장되지 않으며, 런타임에 buildSystemPersona 함수로 생성됨.
    // 하지만 백엔드 API와의 통신을 위해 타입 정의에는 남겨둠 (optional)
    persona?: string;
    
    voice_id?: string;
    category?: string;
    tags?: string[];
    image_url?: string;
    is_preset: boolean;
    user_id?: string;
    created_at?: string;
}

export interface PresetCharacter extends Character {
    is_preset: true;
}

// 캐릭터 생성 요청 - 상세 필드 지원
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
    worldview?: string;   // 세계관 (신규)
    source_work?: string; // 출처/작품 (선택)

    persona?: string;
    
    voice_id?: string;
    category?: string;
    tags?: string[];
    image_url?: string;
}

// 캐릭터 업데이트 요청 - 상세 필드 지원
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
    worldview?: string;   // 세계관 (신규)
    source_work?: string; // 출처/작품 (선택)

    persona?: string;
    
    voice_id?: string;
    category?: string;
    tags?: string[];
    image_url?: string;
}

export interface CharacterResponse {
    characters: Character[];
}

export interface SingleCharacterResponse {
    character: Character;
}

/** 관리자: 캐릭터–Voice 연결/교체용 (DB+Preset 통합 목록 항목) */
export interface AdminCharacterListItem {
    id: string;
    name: string;
    voice_id: string | null;
    is_preset: boolean;
    user_id: string | null;
}
