# Client-Side Type Definitions

This directory contains all frontend-specific type definitions used throughout the React application.

## Directory Structure

```
client/src/types/
├── index.ts           # Central export point for all client types
├── collaboration.ts   # Chat and real-time collaboration types
├── user.ts           # User profile and display types
├── analytics.ts      # Data visualization and analytics types
└── README.md         # This file
```

## Usage

### Importing Types

Always import from the centralized index file:

```typescript
// ✅ Recommended: Import from index
import { UserProfile, ChatMessage, TreemapData } from '@/types';

// ❌ Avoid: Direct imports from specific files
import { UserProfile } from '@/types/user';
import { ChatMessage } from '@/types/collaboration';
```

### Component Usage

```typescript
import { UserProfile, ChatMessage } from '@/types';

interface ProfileCardProps {
  user: UserProfile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
  return (
    <div>
      <h2>{user.firstName || user.email}</h2>
      <p>Plan: {user.plan}</p>
    </div>
  );
};
```

## File Organization

### collaboration.ts

Types for real-time collaboration features:

- **ChatMessage**: Individual chat message structure
- Future: Presence indicators, typing status, etc.

### user.ts

Types for user-related data:

- **UserProfile**: User profile information for display
- Future: User preferences, settings, etc.

### analytics.ts

Types for data visualization:

- **TreemapData**: Hierarchical data for treemap charts
- **TreemapCellProps**: Props for custom treemap cell renderers
- Future: Chart configurations, dashboard layouts, etc.

## Type Conventions

### Naming Conventions

1. **Interfaces**: Use PascalCase (e.g., `UserProfile`, `ChatMessage`)
2. **Props Interfaces**: Suffix with `Props` (e.g., `TreemapCellProps`)
3. **State Interfaces**: Suffix with `State` (e.g., `AuthState`)
4. **Event Handlers**: Prefix with `on` (e.g., `onMessageSent`)

### Documentation Standards

All types should include:

- JSDoc comments explaining the purpose
- Property descriptions
- Usage examples
- Related component references

Example:

```typescript
/**
 * User Profile Interface
 * 
 * Represents a user's profile information displayed in the UI.
 * 
 * @property {number} id - Unique user identifier
 * @property {string} email - User's email address
 * @property {'free' | 'pro' | 'enterprise'} plan - Subscription plan
 * 
 * @example
 * ```typescript
 * const profile: UserProfile = {
 *   id: 123,
 *   email: 'user@example.com',
 *   plan: 'pro'
 * };
 * ```
 */
export interface UserProfile {
  id: number;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}
```

## Adding New Types

When adding new types:

1. **Choose the appropriate file**:
   - Collaboration features → `collaboration.ts`
   - User-related data → `user.ts`
   - Analytics/charts → `analytics.ts`
   - New category → Create new file

2. **Add documentation**:
   - Include JSDoc comments
   - Document all properties
   - Provide usage examples

3. **Export from index.ts**:
   - Add export to the appropriate section
   - Update section comments if needed

4. **Update this README**:
   - Document the new type
   - Add usage examples

## Common Patterns

### Component Props Pattern

```typescript
import { UserProfile } from '@/types';

interface UserCardProps {
  user: UserProfile;
  onEdit?: (user: UserProfile) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  onEdit, 
  className 
}) => {
  // Component implementation
};
```

### State Management Pattern

```typescript
import { ChatMessage } from '@/types';
import { create } from 'zustand';

interface ChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (message) => 
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] })
}));
```

### Event Handler Pattern

```typescript
import { ChatMessage } from '@/types';

interface ChatInputProps {
  onSend: (message: Omit<ChatMessage, 'timestamp'>) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
  const handleSubmit = (text: string) => {
    onSend({
      userId: currentUser.id,
      userName: currentUser.name,
      message: text,
      type: 'message'
    });
  };
  
  // Component implementation
};
```

## Type Safety Best Practices

1. **Use strict types**: Avoid `any`, use specific types
2. **Handle nullability**: Use optional chaining and nullish coalescing
3. **Type guards**: Create type guards for runtime type checking
4. **Discriminated unions**: Use for variant types (e.g., message types)
5. **Generic components**: Use generics for reusable components

### Type Guard Example

```typescript
import { ChatMessage } from '@/types';

function isSystemMessage(message: ChatMessage): boolean {
  return message.type === 'system';
}

// Usage
if (isSystemMessage(message)) {
  // TypeScript knows message.type is 'system'
  renderSystemMessage(message);
}
```

### Discriminated Union Example

```typescript
type MessageType = 
  | { type: 'message'; content: string }
  | { type: 'system'; action: string }
  | { type: 'notification'; level: 'info' | 'warning' | 'error' };

function renderMessage(msg: MessageType) {
  switch (msg.type) {
    case 'message':
      return <div>{msg.content}</div>;
    case 'system':
      return <div>System: {msg.action}</div>;
    case 'notification':
      return <div className={msg.level}>{msg.content}</div>;
  }
}
```

## Integration with Backend Types

Some frontend types are derived from backend types:

```typescript
// Backend type (from @shared/schema)
import type { User } from '@shared/schema';

// Frontend type (simplified for display)
export interface UserProfile {
  id: User['id'];
  email: User['email'];
  firstName?: User['firstName'];
  lastName?: User['lastName'];
  plan: User['plan'];
  avatar?: User['avatar'];
}
```

This approach:
- Keeps frontend types focused on display needs
- Avoids exposing sensitive backend data
- Maintains type safety across the stack

## Testing with Types

```typescript
import { UserProfile, ChatMessage } from '@/types';

// Test fixtures
export const mockUser: UserProfile = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  plan: 'free'
};

export const mockMessage: ChatMessage = {
  userId: 1,
  userName: 'Test User',
  message: 'Hello, world!',
  timestamp: '2025-10-03T12:00:00Z',
  type: 'message'
};

// Usage in tests
describe('ChatComponent', () => {
  it('renders a message', () => {
    render(<ChatComponent message={mockMessage} />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });
});
```

## Migration Guide

### Updating Existing Imports

Before:

```typescript
import { UserProfile } from '@/types/user';
import { ChatMessage } from '@/types/collaboration';
import { TreemapData } from '@/types/analytics';
```

After:

```typescript
import { UserProfile, ChatMessage, TreemapData } from '@/types';
```

### Updating Component Props

Before:

```typescript
interface Props {
  user: any; // ❌ Avoid any
}
```

After:

```typescript
import { UserProfile } from '@/types';

interface Props {
  user: UserProfile; // ✅ Use specific type
}
```

## Related Documentation

- [Shared Types](../../../shared/README.md) - Backend and shared types
- [Component Library](../components/README.md) - Component documentation
- [State Management](../hooks/README.md) - Hooks and state management

## Maintenance

When making changes to types:

1. Ensure backward compatibility
2. Update documentation and examples
3. Run type checking: `npm run check`
4. Update related components
5. Add tests for new types

---

**Last Updated**: October 3, 2025  
**Maintained By**: Frontend Team  
**Related Spec**: `.kiro/specs/code-quality-improvements/`
