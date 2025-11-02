import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpandableSection } from '../expandable-section';
import { TabbedContent, TabDefinition } from '../tabbed-content';
import { EnhancedAccordion, AccordionItemData } from '../enhanced-accordion';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

// Mock the user preferences store
vi.mock('@/stores/userPreferencesStore', () => ({
  useUserPreferencesStore: vi.fn(() => ({
    expandedSections: {},
    setExpandedSection: vi.fn(),
  })),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ExpandableSection', () => {
  it('should render with title', () => {
    render(
      <ExpandableSection id="test-section" title="Test Section">
        <div>Content</div>
      </ExpandableSection>
    );
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('should toggle on click', async () => {
    render(
      <ExpandableSection id="test-section" title="Test Section">
        <div>Content</div>
      </ExpandableSection>
    );
    
    const button = screen.getByRole('button');
    
    // Initially collapsed
    expect(button).toHaveAttribute('aria-expanded', 'false');
    
    // Click to expand
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('should toggle on Enter key', async () => {
    render(
      <ExpandableSection id="test-section" title="Test Section">
        <div>Content</div>
      </ExpandableSection>
    );
    
    const button = screen.getByRole('button');
    
    // Press Enter to expand
    fireEvent.keyDown(button, { key: 'Enter' });
    
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('should toggle on Space key', async () => {
    render(
      <ExpandableSection id="test-section" title="Test Section">
        <div>Content</div>
      </ExpandableSection>
    );
    
    const button = screen.getByRole('button');
    
    // Press Space to expand
    fireEvent.keyDown(button, { key: ' ' });
    
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('should display badge when provided', () => {
    render(
      <ExpandableSection id="test-section" title="Test Section" badge={5}>
        <div>Content</div>
      </ExpandableSection>
    );
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display summary when collapsed', () => {
    render(
      <ExpandableSection 
        id="test-section" 
        title="Test Section" 
        summary="This is a summary"
      >
        <div>Content</div>
      </ExpandableSection>
    );
    
    expect(screen.getByText('This is a summary')).toBeInTheDocument();
  });
});

describe('TabbedContent', () => {
  const tabs: TabDefinition[] = [
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div>, disabled: true },
  ];

  it('should render all tabs', () => {
    render(<TabbedContent tabs={tabs} />);
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('should show first tab content by default', () => {
    render(<TabbedContent tabs={tabs} />);
    
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    render(<TabbedContent tabs={tabs} />);
    
    const tab2Button = screen.getByText('Tab 2');
    fireEvent.click(tab2Button);
    
    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  it('should navigate tabs with arrow keys', async () => {
    render(<TabbedContent tabs={tabs} />);
    
    const tab1Button = screen.getByText('Tab 1');
    
    // Press ArrowRight to go to next tab
    fireEvent.keyDown(tab1Button, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  it('should skip disabled tabs', () => {
    render(<TabbedContent tabs={tabs} />);
    
    const tab3Button = screen.getByText('Tab 3');
    expect(tab3Button).toBeDisabled();
  });

  it('should display badge when provided', () => {
    const tabsWithBadge: TabDefinition[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div>, badge: 3 },
    ];
    
    render(<TabbedContent tabs={tabsWithBadge} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('EnhancedAccordion', () => {
  const items: AccordionItemData[] = [
    { id: 'item1', title: 'Item 1', content: <div>Content 1</div> },
    { id: 'item2', title: 'Item 2', content: <div>Content 2</div> },
    { id: 'item3', title: 'Item 3', content: <div>Content 3</div>, disabled: true },
  ];

  it('should render all items', () => {
    render(<EnhancedAccordion items={items} />);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should expand item on click', async () => {
    render(<EnhancedAccordion items={items} />);
    
    const item1Button = screen.getByText('Item 1');
    fireEvent.click(item1Button);
    
    await waitFor(() => {
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  it('should display badge when provided', () => {
    const itemsWithBadge: AccordionItemData[] = [
      { id: 'item1', title: 'Item 1', content: <div>Content 1</div>, badge: 7 },
    ];
    
    render(<EnhancedAccordion items={itemsWithBadge} />);
    
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should respect disabled state', () => {
    render(<EnhancedAccordion items={items} />);
    
    const item3Button = screen.getByText('Item 3');
    expect(item3Button).toBeDisabled();
  });
});
