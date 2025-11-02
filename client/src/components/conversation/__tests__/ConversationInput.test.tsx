/**
 * ConversationInput Component Tests
 * 
 * Tests input validation, submission, character limits, and accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationInput } from '../ConversationInput';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock haptics
vi.mock('@/lib/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}));

// Mock ConversationUpgradePrompt
vi.mock('../ConversationUpgradePrompt', () => ({
  ConversationUpgradePrompt: () => null,
  RemainingQuestionsIndicator: () => null,
}));

describe('ConversationInput', () => {
  const mockOnSubmit = vi.fn(async () => {});
  const defaultProps = {
    onSubmit: mockOnSubmit,
    disabled: false,
    placeholder: 'Ask a follow-up question...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders input field with placeholder', () => {
      render(<ConversationInput {...defaultProps} />);
      expect(screen.getByPlaceholderText('Ask a follow-up question...')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<ConversationInput {...defaultProps} />);
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('disables input when disabled prop is true', () => {
      render(<ConversationInput {...defaultProps} disabled={true} />);
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      expect(input).toBeDisabled();
    });
  });

  describe('Input Validation', () => {
    it('disables submit button when input is empty', () => {
      render(<ConversationInput {...defaultProps} />);
      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toBeDisabled();
    });

    it('enables submit button when input has text', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      await user.type(input, 'Test question');
      
      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toBeEnabled();
    });

    it('trims whitespace from input', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      await user.type(input, '  Test question  ');
      
      const button = screen.getByRole('button', { name: /send/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Test question');
      });
    });
  });

  describe('Character Limit', () => {
    it('shows character count', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} maxLength={500} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      await user.type(input, 'Test');
      
      expect(screen.getByText(/4\/500/)).toBeInTheDocument();
    });

    it('prevents input beyond max length', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} maxLength={10} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...') as HTMLTextAreaElement;
      await user.type(input, 'This is a very long text that exceeds the limit');
      
      expect(input.value.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Submission', () => {
    it('calls onSubmit with input value when button clicked', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      await user.type(input, 'Test question');
      
      const button = screen.getByRole('button', { name: /send/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Test question');
      });
    });

    it('calls onSubmit when Enter key pressed', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      await user.type(input, 'Test question{Enter}');
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Test question');
      });
    });

    it('clears input after successful submission', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...') as HTMLTextAreaElement;
      await user.type(input, 'Test question');
      
      const button = screen.getByRole('button', { name: /send/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ConversationInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      expect(input).toHaveAttribute('aria-label', 'Message input');
      
      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toHaveAttribute('aria-label', 'Send message');
    });

    it('has aria-describedby for character count', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} maxLength={100} />);
      
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      expect(input).toHaveAttribute('aria-describedby', 'character-count');
      
      await user.type(input, 'Test');
      
      const charCount = screen.getByText(/4\/100/);
      expect(charCount).toHaveAttribute('id', 'character-count');
    });

    it('is keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ConversationInput {...defaultProps} />);
      
      await user.tab();
      const input = screen.getByPlaceholderText('Ask a follow-up question...');
      expect(input).toHaveFocus();
      
      await user.type(input, 'Test');
      
      await user.tab();
      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toHaveFocus();
    });
  });
});
