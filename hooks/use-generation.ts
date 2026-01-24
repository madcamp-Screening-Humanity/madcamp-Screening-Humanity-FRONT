'use client';

import { useState, useCallback } from 'react';
import { generationApi, type GenerationStatus } from '@/lib/api';

export function useGeneration() {
    const [status, setStatus] = useState<GenerationStatus | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = useCallback(async (
        image: File,
        styleTransfer: boolean = true,
        onProgress?: (status: GenerationStatus) => void
    ) => {
        setIsGenerating(true);
        setError(null);
        setStatus(null);

        try {
            // 1. 생성 시작
            const startResponse = await generationApi.generateCharacter(image, styleTransfer);

            if (!startResponse.success || !startResponse.data) {
                const errorMsg = startResponse.error?.message || '생성 시작 실패';
                setError(errorMsg);
                throw new Error(errorMsg);
            }

            const { job_id } = startResponse.data;

            // 2. 상태 폴링
            const result = await generationApi.pollUntilComplete(
                job_id,
                (progressStatus) => {
                    setStatus(progressStatus);
                    onProgress?.(progressStatus);
                }
            );

            if (result.success && result.data) {
                setStatus(result.data);

                if (result.data.status === 'failed') {
                    const errorMsg = result.data.error || '생성 실패';
                    setError(errorMsg);
                    throw new Error(errorMsg);
                }

                return result.data;
            } else {
                const errorMsg = result.error?.message || '상태 조회 실패';
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

    const reset = useCallback(() => {
        setStatus(null);
        setError(null);
        setIsGenerating(false);
    }, []);

    return {
        status,
        isGenerating,
        error,
        generate,
        reset,
    };
}
