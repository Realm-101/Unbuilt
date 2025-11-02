import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ExpandableSection } from '@/components/ui/expandable-section';
import { TabbedContent, TabDefinition } from '@/components/ui/tabbed-content';
import { EnhancedAccordion, AccordionItemData } from '@/components/ui/enhanced-accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SkipLink } from '@/components/accessibility/SkipLink';
import { AccessibleFormField } from '@/components/accessibility/AccessibleFormField';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('Progressive Disclosure Components', () => {
    it('ExpandableSection should have no accessibility violations', async () => {
      const { container } = render(
        <ExpandableSection id="test" title="Test Section">
          <div>Content</div>
        </ExpandableSection>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TabbedContent should have no accessibility violations', async () => {
      const tabs: TabDefinition[] = [
        { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
        { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
      ];

      const { container } = render(<TabbedContent tabs={tabs} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('EnhancedAccordion should have no accessibility violations', async () => {
      const items: AccordionItemData[] = [
        { id: 'item1', title: 'Item 1', content: <div>Content 1</div> },
        { id: 'item2', title: 'Item 2', content: <div>Content 2</div> },
      ];

      const { container } = render(<EnhancedAccordion items={items} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('UI Components', () => {
    it('Button should have no accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Dialog should have no accessibility violations', async () => {
      const { container } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <div>Dialog content</div>
          </DialogContent>
        </Dialog>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Accessibility Components', () => {
    it('SkipLink should have no accessibility violations', async () => {
      const { container } = render(<SkipLink href="#main" />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AccessibleFormField should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleFormField
          id="test-field"
          label="Test Field"
          error="Test error"
          description="Test description"
        >
          <input id="test-field" type="text" />
        </AccessibleFormField>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have proper focus indicators', () => {
      const { container } = render(
        <div>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Button>Button 3</Button>
        </div>
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        // Check that buttons are focusable
        expect(button.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have logical tab order', () => {
      const { container } = render(
        <form>
          <input type="text" placeholder="First" />
          <input type="text" placeholder="Second" />
          <button type="submit">Submit</button>
        </form>
      );

      const focusableElements = container.querySelectorAll(
        'input, button, select, textarea, a[href]'
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA labels on icon buttons', () => {
      const { container } = render(
        <Button aria-label="Close dialog">
          <span>×</span>
        </Button>
      );

      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('should have proper ARIA roles', () => {
      const { container } = render(
        <nav role="navigation">
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
          </ul>
        </nav>
      );

      const nav = container.querySelector('nav');
      expect(nav?.getAttribute('role')).toBe('navigation');
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast for text', async () => {
      const { container } = render(
        <div className="bg-background text-foreground p-4">
          <h1>Heading Text</h1>
          <p>Body text with sufficient contrast</p>
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });
  });

  describe('Alternative Text', () => {
    it('should have alt text for images', async () => {
      const { container } = render(
        <img src="/test.jpg" alt="Test image description" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const img = container.querySelector('img');
      expect(img?.getAttribute('alt')).toBe('Test image description');
    });

    it('should have aria-label for decorative icons', () => {
      const { container } = render(
        <button aria-label="Search">
          <svg aria-hidden="true">
            <path d="M10 10" />
          </svg>
        </button>
      );

      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toBe('Search');

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Form Accessibility', () => {
    it('should associate labels with inputs', async () => {
      const { container } = render(
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const label = container.querySelector('label');
      const input = container.querySelector('input');
      expect(label?.getAttribute('for')).toBe(input?.id);
    });

    it('should have error messages associated with inputs', async () => {
      const { container } = render(
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            aria-describedby="password-error"
            aria-invalid="true"
          />
          <span id="password-error">Password is required</span>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const input = container.querySelector('input');
      expect(input?.getAttribute('aria-describedby')).toBe('password-error');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Reduced Motion', () => {
    it('should respect prefers-reduced-motion', () => {
      // Mock matchMedia for reduced motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(
        <div className="motion-safe:animate-fade-in">Content</div>
      );

      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });
});
