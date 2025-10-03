# Shared Types and Schemas

This directory contains all shared type definitions, database schemas, and validation schemas used across both the frontend and backend of the application.

## Directory Structure

```
shared/
├── index.ts           # Central export point for all shared types
├── types.ts           # API response types and Express handler types
├── schema.ts          # Database schemas and Drizzle ORM types
├── auth-schema.ts     # Authentication validation schemas
└── README.md          # This file
```

## Usage

### Importing from Shared Types

Always import from the centralized index file for cleaner imports:

```typescript
// ✅ Recommended: Import from index
import { User, LoginData, ApiResponse, UserSession } from '@shared/index';

// ❌ Avoid: Direct imports from specific files
import { User } from '@shared/schema';
import { LoginData } from '@shared/auth-schema';
```

### Frontend Usage

Frontend code can import shared types using the `@shared` alias:

```typescript
import { User, LoginData, RegisterData } from '@shared/index';

const handleLogin = async (data: LoginData) => {
  // ...
};
```

### Backend Usage

Backend code also uses the `@shared` alias:

```typescript
import { User, ApiResponse, UserSession } from '@shared/index';

export const getUser = async (id: number): Promise<ApiResponse<User>> => {
  // ...
};
```

## File Organization

### types.ts

Contains general-purpose types used across the application:

- **Express Handler Types**: `RouteHandler`, `AsyncRouteHandler`, `MiddlewareHandler`
- **Session Types**: `UserSession`
- **API Response Types**: `ApiResponse`, `ErrorResponse`, `SuccessResponse`
- **Pagination Types**: `PaginationParams`, `PaginatedResponse`

### schema.ts

Contains database schemas and Drizzle ORM types:

- **Database Tables**: `users`, `searches`, `searchResults`, `sessions`, etc.
- **Database Types**: `User`, `Search`, `SearchResult`, `Idea`, etc.
- **Insert Types**: `InsertUser`, `InsertSearch`, `InsertIdea`, etc.
- **Validation Schemas**: `insertSearchSchema`, `validateIdeaSchema`, etc.
- **Constants**: `PLAN_LIMITS`, `PLAN_PRICES`

### auth-schema.ts

Contains authentication-specific validation schemas:

- **Validation Schemas**: `loginSchema`, `registerSchema`, `changePasswordSchema`, etc.
- **Validation Types**: `LoginData`, `RegisterData`, `ChangePasswordData`, etc.
- **Configuration**: `PLAN_LIMITS`

## Type Conventions

### Naming Conventions

1. **Database Types**: Use singular PascalCase (e.g., `User`, `Search`, `Idea`)
2. **Insert Types**: Prefix with `Insert` (e.g., `InsertUser`, `InsertSearch`)
3. **Validation Types**: Suffix with `Data` (e.g., `LoginData`, `RegisterData`)
4. **Schema Variables**: Use plural camelCase (e.g., `users`, `searches`, `ideas`)
5. **Validation Schemas**: Suffix with `Schema` (e.g., `loginSchema`, `registerSchema`)

### Type Documentation

All complex types should include:

- JSDoc comments explaining the purpose
- Property descriptions with `@property` tags
- Usage examples with `@example` tags
- Type parameters with `@template` tags (for generics)

Example:

```typescript
/**
 * User Session Type
 * 
 * Represents the authenticated user session data stored in JWT tokens.
 * 
 * @property {number} id - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} plan - User's subscription plan
 * 
 * @example
 * ```typescript
 * const session: UserSession = {
 *   id: 123,
 *   email: 'user@example.com',
 *   plan: 'pro',
 *   jti: 'unique-token-id'
 * };
 * ```
 */
export interface UserSession {
  id: number;
  email: string;
  plan: string;
  jti: string;
}
```

## Adding New Types

When adding new types to the shared directory:

1. **Determine the appropriate file**:
   - API/response types → `types.ts`
   - Database schemas → `schema.ts`
   - Auth validation → `auth-schema.ts`

2. **Add comprehensive documentation**:
   - Include JSDoc comments
   - Document all properties
   - Provide usage examples

3. **Export from index.ts**:
   - Add the new type to the appropriate section in `index.ts`
   - Group related exports together
   - Add comments to organize sections

4. **Update this README**:
   - Document the new type in the appropriate section
   - Update examples if needed

## Type Safety Best Practices

1. **Avoid `any` types**: Use specific types or `unknown` instead
2. **Use strict null checks**: Always handle nullable values properly
3. **Leverage type inference**: Let TypeScript infer types when possible
4. **Use branded types**: For IDs and sensitive data (future enhancement)
5. **Document complex types**: Add JSDoc comments for maintainability

## Common Patterns

### API Response Pattern

```typescript
import { ApiResponse } from '@shared/index';

// Success response
const successResponse: ApiResponse<User> = {
  success: true,
  data: user,
  timestamp: new Date().toISOString()
};

// Error response
const errorResponse: ApiResponse = {
  success: false,
  error: 'User not found',
  code: 'USER_NOT_FOUND',
  timestamp: new Date().toISOString()
};
```

### Pagination Pattern

```typescript
import { PaginatedResponse, PaginationParams } from '@shared/index';

const params: PaginationParams = {
  limit: 10,
  offset: 0,
  page: 1
};

const response: PaginatedResponse<User> = {
  success: true,
  data: users,
  pagination: {
    total: 100,
    page: 1,
    limit: 10,
    hasNext: true,
    hasPrev: false
  },
  timestamp: new Date().toISOString()
};
```

### Validation Pattern

```typescript
import { loginSchema, type LoginData } from '@shared/index';

const validateLogin = (data: unknown): LoginData => {
  return loginSchema.parse(data);
};
```

## Migration Guide

If you're updating existing code to use the centralized index:

### Before

```typescript
import { User } from '@shared/schema';
import { LoginData } from '@shared/auth-schema';
import { ApiResponse } from '@shared/types';
```

### After

```typescript
import { User, LoginData, ApiResponse } from '@shared/index';
```

## Related Documentation

- [API Documentation](../docs/API.md)
- [Database Schema](../docs/DATABASE_SETUP.md)
- [Authentication](../docs/AUTHORIZATION.md)
- [Contributing Guide](../CONTRIBUTING.md)

## Maintenance

This directory is maintained as part of the code quality improvements initiative. When making changes:

1. Ensure backward compatibility
2. Update documentation
3. Run type checking: `npm run check`
4. Update tests if needed
5. Review with the team

---

**Last Updated**: October 3, 2025  
**Maintained By**: Development Team  
**Related Spec**: `.kiro/specs/code-quality-improvements/`
