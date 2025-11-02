/**
 * AIMessage Component Tests
 * 
 * Tests rendering, copying, rating, and reporting of AI messages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIMessage } from '../AIMessage';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock haptics
vi.mock('@/lib/haptics', () => ({
  hapticLight: vi.fn(),
  hapticMedium: vi.fn(),
  hapticSuccess: vi.fn(),
}));

// Mock mobile optimizations
vi.mock('@/lib/mobile-optimizations', () => ({
  shouldReduceMotion: () => false,
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

const mockMessage = {
  id: 2,
  conversationId: 1,
  role: 'assistant' as const,
  content: 'The market size is estimated at $5B.',
  createdAt: new Date('2024-01-01T10:01:00Z'),
  metadata: {
    confidence: 85,
    sources: ['https://example.com/report'],
    assumptions: ['Based on 2024 data'],
  },
};

describe('AIMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AI message content', () => {
    render(<AIMessage message={mockMessage} />);

    expect(screen.getByText('The market size is estimated at $5B.')).toBeInTheDocument();
  });

  it('displays AI avatar', () => {
    render(<AIMessage message={mockMessage} />);

    expect(screen.getByLabelText('AI Assistant')).toBeInTheDocument();
  });

  it('displays confidence indicator', () => {
    render(<AIMessage message={mockMessage} />);

    expect(screen.getByText(/confidence: 85%/i)).toBeInTheDocument();
  });

  it('displays assumptions', () => {
    render(<AIMessage message={mockMessage} />);

    expect(screen.getByText(/assumptions:/i)).toBeInTheDocument();
    expect(screen.getByText('Based on 2024 data')).toBeInTheDocument();
  });

  it('displays sources', () => {
    render(<AIMessage message={mockMessage} />);

    expect(screen.getByText(/sources:/i)).toBeInTheDocument();
    expect(screen.getByText(/example\.com\/report/i)).toBeInTheDocument();
  });

  it('copies message to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(<AIMessage message={mockMessage} onCopy={onCopy} />);

    const copyButton = screen.getByRole('button', { name: /copy message to clipboard/i });
    await user.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('The market size is estimated at $5B.');
    expect(onCopy).toHaveBeenCalled();
  });

  it('shows check icon after copying', async () => {
    const user = userEvent.setup();

    render(<AIMessage message={mockMessage} />);

    const copyButton = screen.getByRole('button', { name: /copy message to clipboard/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied to clipboard/i })).toBeInTheDocument();
    });
  });

  it('calls onRate with positive rating when thumbs up is clicked', async () => {
    const user = userEvent.setup();
    const onRate = vi.fn();

    render(<AIMessage message={mockMessage} onRate={onRate} />);

    const thumbsUpButton = screen.getByRole('button', { name: /rate response as helpful/i });
    await user.click(thumbsUpButton);

    expect(onRate).toHaveBeenCalledWith(2, 1);
  });

  it('calls onRate with negative rating when thumbs down is clicked', async () => {
    const user = userEvent.setup();
    const onRate = vi.fn();

    render(<AIMessage message={mockMessage} onRate={onRate} />);

    const thumbsDownButton = screen.getByRole('button', { name: /rate response as not helpful/i });
    await user.click(thumbsDownButton);

    expect(onRate).toHaveBeenCalledWith(2, -1);
  });

  it('shows visual feedback for positive rating', async () => {
    const user = userEvent.setup();

    render(<AIMessage message={mockMessage} onRate={vi.fn()} />);

    const thumbsUpButton = screen.getByRole('button', { name: /rate response as helpful/i });
    await user.click(thumbsUpButton);

    expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows visual feedback for negative rating', async () => {
    const user = userEvent.setup();

    render(<AIMessage message={mockMessage} onRate={vi.fn()} />);

    const thumbsDownButton = screen.getByRole('button', { name: /rate response as not helpful/i });
    await user.click(thumbsDownButton);

    expect(thumbsDownButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows report dialog when report button is clicked', async () => {
    const user = userEvent.setup();

    render(<AIMessage message={mockMessage} onReport={vi.fn()} />);

    const reportButton = screen.getByRole('button', { name: /report inappropriate content/i });
    await user.click(reportButton);

    await waitFor(() => {
      expect(screen.getByText('Report Inappropriate Content')).toBeInTheDocument();
    });
  });

  it('calls onReport when report is confirmed', async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();

    render(<AIMessage message={mockMessage} onReport={onReport} />);

    const reportButton = screen.getByRole('button', { name: /report inappropriate content/i });
    await user.click(reportButton);

    await waitFor(() => {
      expect(screen.getByText('Report Inappropriate Content')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /report/i, hidden: false });
    await user.click(confirmButton);

    expect(onReport).toHaveBeenCalledWith(2);
  });

  it('renders without metadata gracefully', () => {
    const messageWithoutMetadata = {
      ...mockMessage,
      metadata: {},
    };

    render(<AIMessage message={messageWithoutMetadata} />);

    expect(screen.getByText('The market size is estimated at $5B.')).toBeInTheDocument();
    expect(screen.queryByText(/confidence:/i)).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<AIMessage message={mockMessage} />);

    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', expect.stringContaining('AI response'));
  });
});
