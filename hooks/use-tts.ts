'use client';

import { useState, useCallback, useRef } from 'react';
import { ttsApi, type TTSRequest } from '@/lib/api';

export function useTTS() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const generateSpeech = useCallback(async (request: TTSRequest) => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await ttsApi.generateSpeech(request);

            if (response.success && response.data) {
                const fullUrl = ttsApi.getAudioUrl(response.data.audio_url);
                setAudioUrl(fullUrl);
                return response.data;
            } else {
                const errorMsg = response.error?.message || 'TTS 생성 실패';
                setError(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류';
            setError(errorMsg);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const play = useCallback((url?: string) => {
        const urlToPlay = url || audioUrl;
        if (!urlToPlay) return;

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(urlToPlay);
        audioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
            setIsPlaying(false);
            setError('오디오 재생 실패');
        };

        audio.play().catch((err) => {
            setError('오디오 재생 실패: ' + err.message);
            setIsPlaying(false);
        });
    }, [audioUrl]);

    const pause = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, []);

    const reset = useCallback(() => {
        stop();
        setAudioUrl(null);
        setError(null);
    }, [stop]);

    return {
        isGenerating,
        isPlaying,
        error,
        audioUrl,
        generateSpeech,
        play,
        pause,
        stop,
        reset,
    };
}
