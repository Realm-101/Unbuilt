/**
 * Progressive Disclosure Components
 * 
 * This module exports reusable components for implementing progressive disclosure patterns
 * throughout the Unbuilt platform. These components help reduce information overload by
 * revealing content gradually.
 * 
 * Components:
 * - ExpandableSection: Collapsible sections with state persistence
 * - TabbedContent: Tab-based content organization with advanced features
 * - EnhancedAccordion: Single-open accordion pattern with smooth animations
 * 
 * Requirements: 3.2, 3.3, 3.4, 12.1, 12.3, 15.2
 */

export { ExpandableSection } from './expandable-section';
export type { ExpandableSectionProps } from './expandable-section';

export { TabbedContent } from './tabbed-content';
export type { TabbedContentProps, TabDefinition } from './tabbed-content';

export { EnhancedAccordion } from './enhanced-accordion';
export type { EnhancedAccordionProps, AccordionItemData } from './enhanced-accordion';
