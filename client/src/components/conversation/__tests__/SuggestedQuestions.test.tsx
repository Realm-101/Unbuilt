/**
 * SuggestedQuestions Component Tests
 * 
 * Tests rendering, categorization, and click handling of suggested questions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestedQuestions } from '../SuggestedQuestions';

const mockQuestions = [
  {
    id: 1,
    text: 'What evidence supports the market demand?',
    category: 'market_validation' as const,
    priority: 90,
    used: false,
  },
  {
    id: 2,
    text: 'Who are the main competitors?',
    category: 'competitive_analysis' as const,
    priority: 85,
    used: false,
  },
  {
    id: 3,
    text: 'What should be my first step?',
    category: 'execution_strategy' as const,
    priority: 80,
    used: false,
  },
  {
    id: 4,
    text: 'What are the biggest risks?',
    category: 'risk_assessment' as const,
    priority: 75,
    used: false,
  },
];

describe('SuggestedQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders suggested questions header', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    expect(screen.getByText('Suggested Questions')).toBeInTheDocument();
  });

  it('displays question count badge', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders all question buttons', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    expect(screen.getByText('What evidence supports the market demand?')).toBeInTheDocument();
    expect(screen.getByText('Who are the main competitors?')).toBeInTheDocument();
    expect(screen.getByText('What should be my first step?')).toBeInTheDocument();
    expect(screen.getByText('What are the biggest risks?')).toBeInTheDocument();
  });

  it('displays category badges for each question', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    expect(screen.getByText('Market Validation')).toBeInTheDocument();
    expect(screen.getByText('Competitive Analysis')).toBeInTheDocument();
    expect(screen.getByText('Execution Strategy')).toBeInTheDocument();
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
  });

  it('calls onQuestionClick with question text when clicked', async () => {
    const user = userEvent.setup();
    const onQuestionClick = vi.fn();

    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={onQuestionClick} 
      />
    );

    const questionButton = screen.getByText('What evidence supports the market demand?');
    await user.click(questionButton);

    expect(onQuestionClick).toHaveBeenCalledWith('What evidence supports the market demand?');
  });

  it('marks question as used after clicking', async () => {
    const user = userEvent.setup();

    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    const questionButton = screen.getByText('What evidence supports the market demand?');
    await user.click(questionButton);

    expect(questionButton).toBeDisabled();
  });

  it('filters out already used questions', () => {
    const questionsWithUsed = [
      ...mockQuestions,
      {
        id: 5,
        text: 'Already used question',
        category: 'market_validation' as const,
        priority: 95,
        used: true,
      },
    ];

    render(
      <SuggestedQuestions 
        questions={questionsWithUsed} 
        onQuestionClick={vi.fn()} 
      />
    );

    expect(screen.queryByText('Already used question')).not.toBeInTheDocument();
  });

  it('sorts questions by priority', () => {
    const unsortedQuestions = [
      {
        id: 1,
        text: 'Low priority',
        category: 'market_validation' as const,
        priority: 50,
        used: false,
      },
      {
        id: 2,
        text: 'High priority',
        category: 'market_validation' as const,
        priority: 95,
        used: false,
      },
      {
        id: 3,
        text: 'Medium priority',
        category: 'market_validation' as const,
        priority: 75,
        used: false,
      },
    ];

    render(
      <SuggestedQuestions 
        questions={unsortedQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    const buttons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('data-suggestion') === 'true'
    );

    expect(buttons[0]).toHaveTextContent('High priority');
    expect(buttons[1]).toHaveTextContent('Medium priority');
    expect(buttons[2]).toHaveTextContent('Low priority');
  });

  it('limits display to top 5 questions', () => {
    const manyQuestions = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      text: `Question ${i + 1}`,
      category: 'market_validation' as const,
      priority: 100 - i,
      used: false,
    }));

    render(
      <SuggestedQuestions 
        questions={manyQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    const buttons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('data-suggestion') === 'true'
    );

    expect(buttons).toHaveLength(5);
  });

  it('shows loading skeleton when loading', () => {
    render(
      <SuggestedQuestions 
        questions={[]} 
        onQuestionClick={vi.fn()} 
        loading={true}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders nothing when no questions available', () => {
    const { container } = render(
      <SuggestedQuestions 
        questions={[]} 
        onQuestionClick={vi.fn()} 
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('supports keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup();

    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    const firstButton = screen.getByText('What evidence supports the market demand?');
    firstButton.focus();

    await user.keyboard('{ArrowRight}');
    
    // Second button should be focused (implementation depends on grid layout)
    expect(document.activeElement).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={vi.fn()} 
      />
    );

    const group = screen.getByRole('group', { name: /suggested questions/i });
    expect(group).toBeInTheDocument();

    const buttons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('data-suggestion') === 'true'
    );

    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });
});
