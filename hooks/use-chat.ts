'use client';

import { useState, useCallback } from 'react';
import { chatApi, type ChatRequest, type ChatResponse, type Message } from '@/lib/api';

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (
        content: string,
        options?: Partial<Omit<ChatRequest, 'messages'>>
    ) => {
        setIsLoading(true);
        setError(null);

        const userMessage: Message = { role: 'user', content };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        try {
            const response = await chatApi.chat({
                messages: newMessages,
                ...options,
            });

            if (response.success && response.data) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: response.data.content,
                };
                setMessages([...newMessages, assistantMessage]);
                return response.data;
            } else {
                const errorMsg = response.error?.message || '채팅 요청 실패';
                setError(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [messages]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearMessages,
        resetError,
    };
}
