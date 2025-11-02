# Conversation Interface Accessibility

This document provides a comprehensive guide to the accessibility features implemented in the conversation interface.

## Overview

The conversation interface is fully accessible and compliant with WCAG 2.1 Level AA standards. It supports keyboard navigation, screen readers, high contrast modes, and cognitive accessibility features.

## Quick Start

### For Keyboard Users

**Essential Shortcuts:**
- `Enter` - Send message (in input field)
- `Shift + Enter` - New line (in input field)
- `Tab` - Navigate through interface
- `Arrow Keys` - Navigate suggested questions
- `Escape` - Cancel input or return to input
- `Ctrl + /` - Focus input field (global)
- `Ctrl + ?` - Show keyboard shortcuts (global)

**Navigation:**
1. Press `Tab` to move through interactive elements
2. Use `Arrow Keys` to navigate suggested questions
3. Press `Enter` to select a question or send a message
4. Press `Escape` to cancel or return to input

### For Screen Reader Users

**Structure:**
- Main region: "Conversation interface"
- Message list: Marked as "log" with live updates
- Individual messages: Marked as "articles" with timestamps
- Buttons: All have descriptive labels

**Announcements:**
- New messages are announced automatically
- Loading states are announced
- Errors are announced
- Success confirmations are announced

**Tips:**
- Use heading navigation to jump between sections
- Use landmark navigation to jump to main areas
- Listen for live region updates for new messages

### For Users with Low Vision

**High Contrast:**
- Message bubbles have 4.5:1 minimum contrast ratio
- Focus indicators have 3:1 minimum contrast ratio
- All text meets WCAG AA standards

**Text Scaling:**
- Text can be scaled up to 200% without loss of functionality
- Layout adapts to larger text sizes
- No horizontal scrolling required

**Focus Indicators:**
- 3px solid outline on focused elements
- Additional shadow for enhanced visibility
- High contrast in both light and dark modes

### For Users with Cognitive Disabilities

**Clear Structure:**
- Visual hierarchy with distinct message styles
- Consistent spacing and alignment
- Clear section headings

**Helpful Features:**
- Timestamps on all messages for context
- Edit capability (5-minute window)
- Delete with confirmation
- Clear, specific error messages
- Consistent interaction patterns

**Reduced Complexity:**
- Progressive disclosure (collapsible sections)
- Limited choices (max 5 suggested questions)
- Plain language throughout
- Immediate feedback for actions

## Features

### 1. Keyboard Navigation

#### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + /` | Focus input field |
| `Ctrl + ?` | Show keyboard shortcuts |

#### Input Field
| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Escape` | Cancel/clear input |

#### Suggested Questions
| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down/Left/Right` | Navigate questions |
| `Enter` or `Space` | Select question |
| `Escape` | Return to input |

#### Message Actions
| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate to next action |
| `Shift + Tab` | Navigate to previous action |
| `Enter` or `Space` | Activate button |

### 2. Screen Reader Support

#### ARIA Labels
All interactive elements have descriptive labels:
- "Send message" button
- "Edit message" button
- "Delete message" button
- "Copy message to clipboard" button
- "Rate response as helpful" button
- "Rate response as not helpful" button
- "Report inappropriate content" button

#### ARIA Roles
- `role="region"` - Conversation interface
- `role="log"` - Message list
- `role="article"` - Individual messages
- `role="group"` - Suggested questions
- `role="status"` - Loading and error states

#### Live Regions
- New messages announced automatically
- Loading states announced
- Error messages announced
- Success confirmations announced

### 3. Visual Accessibility

#### Contrast Ratios
- **Text**: 4.5:1 minimum (WCAG AA)
- **UI Components**: 3:1 minimum (WCAG AA)
- **Focus Indicators**: 3:1 minimum (WCAG AA)

#### Color Usage
- Color is never the sole indicator
- Patterns and icons supplement color
- Success: Green + checkmark
- Error: Red + X
- Warning: Orange + exclamation
- Info: Blue + info icon

#### Focus Indicators
- 3px solid outline
- Additional shadow for depth
- High contrast in all modes
- Visible on all interactive elements

#### Text Scaling
- Base font size: 16px
- Scales up to 200%
- No loss of functionality
- No horizontal scrolling

### 4. Cognitive Accessibility

#### Clear Structure
- Visual hierarchy with headings
- Consistent spacing and alignment
- Grouped related elements
- Clear section boundaries

#### Timestamps
- Relative format ("2 minutes ago")
- Consistent placement
- Edit indicators
- Muted styling to reduce noise

#### Edit/Undo
- 5-minute edit window
- Inline editing
- Cancel option
- Delete confirmation

#### Error Messages
- Specific and actionable
- Plain language
- Suggest solutions
- Non-technical

#### Consistent Patterns
- Same button styles throughout
- Predictable keyboard shortcuts
- Uniform loading states
- Standard form patterns

## Implementation Details

### Components

#### AccessibleConversationWrapper
Wraps the conversation interface with accessibility features:
- Skip links for keyboard navigation
- Accessibility CSS styles
- Semantic structure

```tsx
<AccessibleConversationWrapper
  skipToInputId="conversation-input"
  skipToMessagesId="conversation-messages"
>
  {children}
</AccessibleConversationWrapper>
```

#### ConversationLiveRegion
Announces new messages to screen readers:
- Monitors message list
- Announces new messages
- Truncates long messages
- Clears after announcement

```tsx
<ConversationLiveRegion messages={messages} />
```

#### KeyboardShortcutsDialog
Displays keyboard shortcuts reference:
- Comprehensive list of shortcuts
- Organized by context
- Accessible via Ctrl+?
- Keyboard navigable

```tsx
<KeyboardShortcutsDialog
  open={showShortcuts}
  onOpenChange={setShowShortcuts}
/>
```

### Hooks

#### useConversationKeyboardNav
Manages keyboard navigation:
- Global shortcuts
- Context-specific shortcuts
- Focus management
- Event handling

```tsx
useConversationKeyboardNav({
  onSendMessage: () => void,
  onCancelInput: () => void,
  onNavigateSuggestions: (direction) => void,
  onSelectSuggestion: () => void,
  onFocusInput: () => void,
  onShowShortcuts: () => void,
  enabled: boolean
})
```

### Styles

#### conversation-accessibility.css
Comprehensive accessibility styles:
- High contrast message bubbles
- Clear focus indicators
- Resizable text support
- Color-blind friendly patterns
- Reduced motion support
- Print styles

## Testing

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Keyboard shortcuts work
- [ ] No keyboard traps
- [ ] Logical tab order

#### Screen Reader
- [ ] All elements have labels
- [ ] Live regions announce updates
- [ ] Semantic structure is correct
- [ ] No redundant announcements
- [ ] Context is clear

#### Visual
- [ ] Contrast ratios meet standards
- [ ] Focus indicators are visible
- [ ] Text scales to 200%
- [ ] No horizontal scrolling
- [ ] Color is not sole indicator

#### Cognitive
- [ ] Structure is clear
- [ ] Error messages are helpful
- [ ] Interaction patterns are consistent
- [ ] Undo/edit works correctly
- [ ] Timestamps provide context

### Automated Testing

#### Tools
- **axe DevTools**: Accessibility violations
- **WAVE**: Accessibility errors
- **Lighthouse**: Accessibility score
- **Pa11y**: Automated testing

#### CI/CD Integration
```bash
# Run accessibility tests
npm run test:a11y

# Check contrast ratios
npm run test:contrast

# Validate ARIA
npm run test:aria
```

### Browser Testing

#### Supported Browsers
- Chrome/Edge (Chromium)
- Firefox
- Safari (WebKit)

#### Screen Readers
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## Troubleshooting

### Common Issues

#### Focus Not Visible
**Problem**: Focus indicator not showing
**Solution**: Check if browser has custom focus styles that override ours

#### Screen Reader Not Announcing
**Problem**: New messages not announced
**Solution**: Verify ARIA live region is present and not hidden

#### Keyboard Shortcuts Not Working
**Problem**: Shortcuts don't trigger actions
**Solution**: Check if another element has focus or if shortcuts are disabled

#### Text Not Scaling
**Problem**: Text doesn't scale with browser zoom
**Solution**: Verify rem units are used instead of px

### Debug Mode

Enable debug mode to see accessibility information:
```tsx
<ConversationInterface
  analysisId={id}
  debugAccessibility={true}
/>
```

This will:
- Highlight focus order
- Show ARIA labels
- Display live region updates
- Log keyboard events

## Resources

### WCAG Guidelines
- [WCAG 2.1 Overview](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [Techniques for WCAG 2.1](https://www.w3.org/WAI/WCAG21/Techniques/)

### ARIA Patterns
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [ARIA Live Regions](https://www.w3.org/WAI/ARIA/apg/practices/live-regions/)
- [Keyboard Navigation](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://pa11y.org/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver](https://www.apple.com/accessibility/voiceover/)

## Contributing

### Adding New Features

When adding new features, ensure:
1. Keyboard navigation works
2. Screen reader support is added
3. Contrast ratios are sufficient
4. Focus indicators are visible
5. Error messages are clear
6. Interaction patterns are consistent

### Code Review Checklist

- [ ] Keyboard navigation tested
- [ ] ARIA labels added
- [ ] Contrast ratios checked
- [ ] Focus indicators visible
- [ ] Screen reader tested
- [ ] Documentation updated

## Support

For accessibility issues or questions:
- Open an issue on GitHub
- Contact the accessibility team
- Review the WCAG guidelines
- Test with assistive technologies

## License

This accessibility implementation follows WCAG 2.1 Level AA standards and is part of the Unbuilt platform.
