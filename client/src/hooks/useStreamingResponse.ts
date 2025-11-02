import { useState, useCallback, useRef } from 'react';

/**
 * Hook for handling streaming AI responses
 * Provides real-time updates as chunks arrive from the server
 */

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  metadata: {
    tokensUsed?: {
      input: number;
      output: number;
      total: number;
    };
    processingTime?: number;
  } | null;
  messageId: number | null;
}

export interface UseStreamingResponseOptions {
  onComplete?: (content: string, messageId: number, metadata: any) => void;
  onError?: (error: string) => void;
  onChunk?: (chunk: string) => void;
}

export function useStreamingResponse(options: UseStreamingResponseOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    error: null,
    metadata: null,
    messageId: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(
    async (analysisId: number, content: string) => {
      // Reset state
      setState({
        isStreaming: true,
        content: '',
        error: null,
        metadata: null,
        messageId: null,
      });

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        // Send message with streaming enabled
        const response = await fetch(
          `/api/conversations/${analysisId}/messages?stream=true`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is SSE
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/event-stream')) {
          // Handle SSE streaming
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('Response body is not readable');
          }

          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'chunk') {
                    setState((prev) => ({
                      ...prev,
                      content: prev.content + data.content,
                    }));
                    options.onChunk?.(data.content);
                  } else if (data.type === 'complete') {
                    setState((prev) => ({
                      ...prev,
                      isStreaming: false,
                      metadata: data.metadata,
                      messageId: data.messageId,
                    }));
                    options.onComplete?.(
                      state.content,
                      data.messageId,
                      data.metadata
                    );
                  } else if (data.type === 'error') {
                    setState((prev) => ({
                      ...prev,
                      isStreaming: false,
                      error: data.error,
                    }));
                    options.onError?.(data.error);
                  }
                } catch (error) {
                  console.error('Error parsing SSE data:', error);
                }
              }
            }
          }
        } else {
          // Fallback to regular JSON response
          const data = await response.json();
          setState({
            isStreaming: false,
            content: data.aiMessage.content,
            error: null,
            metadata: data.aiMessage.metadata,
            messageId: data.aiMessage.id,
          });
          options.onComplete?.(
            data.aiMessage.content,
            data.aiMessage.id,
            data.aiMessage.metadata
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled
          setState((prev) => ({
            ...prev,
            isStreaming: false,
          }));
        } else {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: errorMessage,
          }));
          options.onError?.(errorMessage);
        }
      }
    },
    [options, state.content]
  );

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    cancelStreaming();
    setState({
      isStreaming: false,
      content: '',
      error: null,
      metadata: null,
      messageId: null,
    });
  }, [cancelStreaming]);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    reset,
  };
}
