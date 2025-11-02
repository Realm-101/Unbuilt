/**
 * UserMessage Component Tests
 * 
 * Tests rendering, editing, and deletion of user messages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMessage } from '../UserMessage';

// Mock haptics
vi.mock('@/lib/haptics', () => ({
  hapticLight: vi.fn(),
  hapticMedium: vi.fn(),
  hapticSuccess: vi.fn(),
}));

// Mock mobile optimizations
vi.mock('@/lib/mobile-optimizations', () => ({
  shouldReduceMotion: () => false,
  getAnimationClasses: () => 'animate-in',
}));

const mockMessage = {
  id: 1,
  conversationId: 1,
  role: 'user' as const,
  content: 'What is the market size?',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  metadata: {},
};

describe('UserMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user message content', () => {
    render(<UserMessage message={mockMessage} />);

    expect(screen.getByText('What is the market size?')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    render(<UserMessage message={mockMessage} />);

    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('shows edit button for recent messages', () => {
    const recentMessage = {
      ...mockMessage,
      createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    };

    render(<UserMessage message={recentMessage} onEdit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /edit message/i })).toBeInTheDocument();
  });

  it('hides edit button for old messages', () => {
    const oldMessage = {
      ...mockMessage,
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    };

    render(<UserMessage message={oldMessage} onEdit={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /edit message/i })).not.toBeInTheDocument();
  });

  it('shows delete button when onDelete is provided', () => {
    render(<UserMessage message={mockMessage} onDelete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /delete message/i })).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    const recentMessage = {
      ...mockMessage,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    };

    render(<UserMessage message={recentMessage} onEdit={vi.fn()} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    await user.click(editButton);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onEdit with new content when save is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const recentMessage = {
      ...mockMessage,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    };

    render(<UserMessage message={recentMessage} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    await user.click(editButton);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Updated question');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onEdit).toHaveBeenCalledWith(1, 'Updated question');
  });

  it('cancels edit mode when cancel is clicked', async () => {
    const user = userEvent.setup();
    const recentMessage = {
      ...mockMessage,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    };

    render(<UserMessage message={recentMessage} onEdit={vi.fn()} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    await user.click(editButton);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('What is the market size?')).toBeInTheDocument();
  });

  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup();

    render(<UserMessage message={mockMessage} onDelete={vi.fn()} />);

    const deleteButton = screen.getByRole('button', { name: /delete message/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Message')).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it('calls onDelete when deletion is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<UserMessage message={mockMessage} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete message/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Message')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /delete/i, hidden: false });
    await user.click(confirmButton);

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('shows edited indicator when message was edited', () => {
    const editedMessage = {
      ...mockMessage,
      editedAt: new Date('2024-01-01T10:05:00Z'),
    };

    render(<UserMessage message={editedMessage} />);

    expect(screen.getByText(/edited/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<UserMessage message={mockMessage} />);

    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', expect.stringContaining('Your message'));
  });
});
