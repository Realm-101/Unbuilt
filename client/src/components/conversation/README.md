# Conversation Components

Interactive AI conversation components for the Unbuilt platform. These components enable users to engage in follow-up conversations with the AI about their gap analyses.

## Accessibility

The conversation interface is fully accessible and compliant with WCAG 2.1 Level AA standards. See [ACCESSIBILITY_README.md](./ACCESSIBILITY_README.md) for detailed information about:
- Keyboard navigation (Tab, Enter, Arrow keys, Escape, Ctrl+/, Ctrl+?)
- Screen reader support (ARIA labels, live regions, semantic structure)
- Visual accessibility (High contrast, focus indicators, resizable text)
- Cognitive accessibility (Clear structure, timestamps, edit/undo, clear errors)

For cognitive accessibility features, see [COGNITIVE_ACCESSIBILITY.md](./COGNITIVE_ACCESSIBILITY.md).

## Components

### ConversationInterface

Main container component that orchestrates the entire conversation experience.

**Features:**
- Fetches and displays conversation data
- Manages message sending and receiving
- Auto-scrolls to latest messages
- Handles loading and error states
- Integrates all sub-components

**Usage:**
```tsx
import { ConversationInterface } from '@/components/conversation';

<ConversationInterface 
  analysisId={123}
  onVariantCreated={(variantId) => console.log('Variant created:', variantId)}
/>
```

**Requirements:** 1.1, 1.2, 1.6

---

### UserMessage

Displays user messages in the conversation thread.

**Features:**
- Right-aligned message bubbles
- User avatar display
- Timestamp with relative formatting
- Edit functionality (within 5 minutes)
- Delete with confirmation dialog
- Edit indicator for modified messages

**Usage:**
```tsx
import { UserMessage } from '@/components/conversation';

<UserMessage
  message={message}
  onEdit={(id, content) => handleEdit(id, content)}
  onDelete={(id) => handleDelete(id)}
/>
```

**Requirements:** 1.5, 1.6

---

### AIMessage

Displays AI assistant messages in the conversation thread.

**Features:**
- Left-aligned message bubbles with AI avatar
- Copy to clipboard functionality
- Rating system (thumbs up/down)
- Report inappropriate content
- Confidence indicators
- Source citations
- Assumption display

**Usage:**
```tsx
import { AIMessage } from '@/components/conversation';

<AIMessage
  message={message}
  onCopy={() => handleCopy(message.content)}
  onRate={(id, rating) => handleRate(id, rating)}
  onReport={(id) => handleReport(id)}
/>
```

**Requirements:** 1.5, 6.1, 6.2, 6.6

---

### ConversationInput

Auto-expanding textarea for user input with validation and keyboard shortcuts.

**Features:**
- Auto-expanding textarea (60px - 200px)
- Character count display (max 1000 for Pro, 500 for Free)
- Input validation and sanitization
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Remaining questions indicator for free tier
- Visual feedback for character limits

**Usage:**
```tsx
import { ConversationInput } from '@/components/conversation';

<ConversationInput
  onSubmit={async (content) => await sendMessage(content)}
  disabled={sending}
  placeholder="Ask a follow-up question..."
  maxLength={1000}
  remainingQuestions={3}
/>
```

**Requirements:** 1.2, 1.3, 7.3

---

### SuggestedQuestions

Displays categorized question chips that users can click to submit.

**Features:**
- 3-5 prioritized questions
- Category badges with icons
- Click-to-submit functionality
- Loading skeleton
- Fade out used questions
- Responsive mobile layout with collapse/expand
- Category-based color coding

**Categories:**
- Market Validation (blue)
- Competitive Analysis (purple)
- Execution Strategy (green)
- Risk Assessment (orange)

**Usage:**
```tsx
import { SuggestedQuestions } from '@/components/conversation';

<SuggestedQuestions
  questions={suggestedQuestions}
  onQuestionClick={(question) => handleSubmit(question)}
  loading={false}
/>
```

**Requirements:** 4.1, 4.2, 4.3, 4.7

---

### ConversationHistory

Displays full conversation thread with pagination, search functionality, and ability to scroll to specific messages.

**Features:**
- Full conversation thread display
- Pagination for long conversations (20 messages per page)
- Search within conversation with highlighting
- Navigate through search results
- Scroll to specific message
- Scroll to bottom button
- Message highlighting for search results

**Usage:**
```tsx
import { ConversationHistory } from '@/components/conversation';

<ConversationHistory
  conversationId={conversation.id}
  onMessageEdit={(id, content) => handleEdit(id, content)}
  onMessageDelete={(id) => handleDelete(id)}
  onMessageCopy={(content) => handleCopy(content)}
  onMessageRate={(id, rating) => handleRate(id, rating)}
  onMessageReport={(id) => handleReport(id)}
  highlightMessageId={123}
/>
```

**Requirements:** 5.1, 5.3, 5.6

---

## Data Flow

```
User Input → ConversationInput → ConversationInterface
                                         ↓
                                    API Request
                                         ↓
                                    AI Response
                                         ↓
                            Update Conversation State
                                         ↓
                        Render AIMessage + New Suggestions
                                         ↓
                                  Auto-scroll to Bottom
```

## API Integration

The components integrate with these API endpoints:

- `GET /api/conversations/:analysisId` - Fetch conversation
- `POST /api/conversations/:analysisId/messages` - Send message
- `POST /api/conversations/:conversationId/rate` - Rate message
- `GET /api/conversations/:conversationId/suggestions` - Get suggestions

## State Management

Uses TanStack Query for server state management:
- Automatic caching and invalidation
- Optimistic updates
- Error handling and retries
- Loading states

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:
- Keyboard navigation support
- ARIA labels and roles
- Screen reader friendly
- Focus management
- High contrast support

## Mobile Optimization

- Responsive layouts for all screen sizes
- Touch-friendly button sizes (44x44px minimum)
- Collapsible suggested questions on mobile
- Optimized message rendering
- Smooth animations

## Security

- Input validation and sanitization
- XSS prevention (HTML tag removal)
- Rate limiting integration
- Content moderation hooks
- Secure API communication

## Performance

- Virtualized message list (future enhancement)
- Lazy loading of older messages
- Optimized re-renders with React.memo
- Debounced input handling
- Efficient state updates

## Testing

Test files should be created in `__tests__` directory:
- Component rendering tests
- User interaction tests
- API integration tests
- Accessibility tests
- Mobile responsiveness tests

## Future Enhancements

- Voice input support
- Message search functionality
- Conversation export
- Multi-modal responses (charts, diagrams)
- Real-time streaming responses
- Conversation branching


## Rate Limiting & Upgrade Prompts

The conversation system implements tier-based rate limiting:

**Free Tier:**
- 5 questions per analysis
- 20 questions per day
- 500 character messages
- Upgrade prompts shown when approaching limit

**Pro Tier:**
- Unlimited questions per analysis
- 500 questions per day (soft limit)
- 1000 character messages
- No upgrade prompts

**Enterprise Tier:**
- Unlimited questions
- 2000 character messages
- Priority support

### Upgrade Prompt Components

**ConversationUpgradePrompt** - Displays upgrade prompts for free tier users:
- Banner variant when 2 or fewer questions remain
- Inline card when limit is reached
- Progress indicator showing questions used
- Clear upgrade benefits and CTA

**RemainingQuestionsIndicator** - Subtle indicator for free tier:
- Compact display with icon
- Color-coded based on remaining questions
- Quick upgrade link when low

Upgrade prompts automatically link to the tier comparison modal for seamless upgrade flow.
