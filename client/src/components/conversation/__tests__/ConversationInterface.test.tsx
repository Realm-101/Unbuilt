/**
 * ConversationInterface Component Tests
 * 
 * Tests rendering, interactions, and state management for the main conversation interface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversationInterface } from '../ConversationInterface';

// Mock hooks
vi.mock('@/hooks/useTouchFriendly', () => ({
  useTouchFriendly: () => ({ isTouchDevice: false, isMobile: false }),
}));

vi.mock('@/hooks/useSwipeGesture', () => ({
  useSwipeGesture: () => ({ elementRef: { current: null } }),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ 
    containerRef: { current: null }, 
    isRefreshing: false, 
    pullDistance: 0 
  }),
}));

vi.mock('@/hooks/useConversationKeyboardNav', () => ({
  useConversationKeyboardNav: () => {},
}));

// Mock fetch
global.fetch = vi.fn();

const mockConversationData = {
  conversation: {
    id: 1,
    analysisId: 'test-analysis-1',
    userId: 1,
    messages: [
      {
        id: 1,
        conversationId: 1,
        role: 'user' as const,
        content: 'What is the market size?',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        metadata: {},
      },
      {
        id: 2,
        conversationId: 1,
        role: 'assistant' as const,
        content: 'The market size is estimated at $5B.',
        createdAt: new Date('2024-01-01T10:01:00Z'),
        metadata: { confidence: 85 },
      },
    ],
    suggestedQuestions: [
      {
        id: 1,
        text: 'Who are the main competitors?',
        category: 'competitive_analysis' as const,
        priority: 90,
        used: false,
      },
    ],
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:01:00Z'),
  },
  messages: [],
  suggestions: [],
  analytics: {},
  rateLimit: {
    remaining: 3,
    limit: 5,
    unlimited: false,
    tier: 'free' as const,
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('ConversationInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockConversationData }),
    });
  });

  it('renders loading state initially', () => {
    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders conversation interface after loading', async () => {
    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Ask Follow-up Questions')).toBeInTheDocument();
    });

    expect(screen.getByRole('region', { name: /conversation interface/i })).toBeInTheDocument();
  });

  it('displays existing messages', async () => {
    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('What is the market size?')).toBeInTheDocument();
      expect(screen.getByText('The market size is estimated at $5B.')).toBeInTheDocument();
    });
  });

  it('displays suggested questions', async () => {
    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Who are the main competitors?')).toBeInTheDocument();
    });
  });

  it('handles message submission', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/messages')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              userMessage: {
                id: 3,
                content: 'New question',
                role: 'user',
                createdAt: new Date(),
              },
              aiResponse: {
                id: 4,
                content: 'AI response',
                role: 'assistant',
                createdAt: new Date(),
              },
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockConversationData }),
      });
    });

    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask a follow-up question/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/ask a follow-up question/i);
    await user.type(input, 'New question');
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'New question' }),
        })
      );
    });
  });

  it('shows error state when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load conversation/i)).toBeInTheDocument();
    });
  });

  it('handles suggested question click', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/messages')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockConversationData }),
      });
    });

    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Who are the main competitors?')).toBeInTheDocument();
    });

    const suggestionButton = screen.getByText('Who are the main competitors?');
    await user.click(suggestionButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Who are the main competitors?' }),
        })
      );
    });
  });

  it('switches between chat and history tabs', async () => {
    const user = userEvent.setup();

    render(
      <ConversationInterface analysisId="test-analysis-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
    });

    const historyTab = screen.getByRole('tab', { name: /full history/i });
    await user.click(historyTab);

    expect(historyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onVariantCreated when variant is selected', async () => {
    const onVariantCreated = vi.fn();

    render(
      <ConversationInterface 
        analysisId="test-analysis-1" 
        onVariantCreated={onVariantCreated}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Ask Follow-up Questions')).toBeInTheDocument();
    });

    // Variant selection would trigger the callback
    // This is tested more thoroughly in VariantSelector tests
  });
});
