# Authorization and Access Control System

This document describes the role-based access control (RBAC) system implemented for the application.

## Overview

The authorization system provides:
- Role-based access control with hierarchical permissions
- Resource-level ownership validation
- Administrative function protection
- Middleware for protecting API endpoints

## User Roles

### USER (Default Role)
- Can read, write, and delete their own data
- Can create teams and ideas
- Can share ideas and add comments
- Cannot access other users' data

### ADMIN
- All USER permissions
- Can read other users' data
- Can manage users (view, unlock accounts)
- Can view analytics and security logs
- Can manage teams and invite members

### SUPER_ADMIN
- All ADMIN permissions
- Can write and delete other users' data
- Can manage system settings
- Can perform administrative actions like password resets
- Can manage security settings

## Permissions

The system uses granular permissions:

### User Data Permissions
- `READ_OWN_DATA` - Read own user data
- `WRITE_OWN_DATA` - Modify own user data
- `DELETE_OWN_DATA` - Delete own user data
- `READ_USER_DATA` - Read other users' data (admin+)
- `WRITE_USER_DATA` - Modify other users' data (super admin only)
- `DELETE_USER_DATA` - Delete other users' data (super admin only)

### Administrative Permissions
- `MANAGE_USERS` - User management functions
- `VIEW_ANALYTICS` - System analytics access
- `MANAGE_SYSTEM` - System configuration
- `VIEW_SECURITY_LOGS` - Security event logs
- `MANAGE_SECURITY` - Security settings

### Feature Permissions
- `CREATE_TEAM` - Create teams
- `MANAGE_TEAM` - Manage team settings
- `INVITE_MEMBERS` - Invite team members
- `CREATE_IDEA` - Create ideas
- `SHARE_IDEA` - Share ideas with others
- `COMMENT_IDEA` - Comment on ideas

## Usage

### Middleware

#### Basic Authorization
```typescript
import { requirePermission, requireAdmin } from '../middleware/authorization';

// Require specific permission
app.get('/api/analytics', requirePermission(Permission.VIEW_ANALYTICS), handler);

// Require admin role
app.get('/api/admin/users', requireAdmin, handler);
```

#### Resource Ownership
```typescript
import { validateIdeaOwnership } from '../middleware/resourceOwnership';

// Ensure user can only access their own ideas
app.get('/api/ideas/:id', validateIdeaOwnership('read'), handler);
app.put('/api/ideas/:id', validateIdeaOwnership('write'), handler);
app.delete('/api/ideas/:id', validateIdeaOwnership('delete'), handler);
```

#### Data Scoping
```typescript
import { enforceUserDataScope } from '../middleware/resourceOwnership';

// Automatically filter results to user's own data
app.get('/api/ideas', enforceUserDataScope, handler);
```

### Service Layer

```typescript
import { AuthorizationService, Permission } from '../services/authorizationService';

// Check permissions programmatically
if (AuthorizationService.hasPermission(user, Permission.MANAGE_USERS)) {
  // Allow user management
}

// Validate resource ownership
AuthorizationService.validateResourceOwnership(user, resourceUserId, 'write');

// Check roles
if (AuthorizationService.isAdmin(user)) {
  // Admin-only logic
}
```

## Role Assignment

Currently, roles are determined by email patterns:
- `superadmin@*` or `root@*` → SUPER_ADMIN
- `admin@*` or `support@*` → ADMIN
- All others → USER

In production, roles should be stored in the database and managed through an admin interface.

## Protected Routes

### User Routes
- All user data endpoints require authentication
- Users can only access their own resources unless they have admin privileges

### Admin Routes (`/api/admin/*`)
- All routes require admin or super admin role
- User management, analytics, and system monitoring
- Security event logs and system maintenance

### Resource-Specific Protection
- Ideas: Users can only access/modify their own ideas
- Searches: Users can only access their own search history
- Teams: Team membership validation (when implemented)

## Security Features

### Resource Ownership Validation
- Automatic validation that users can only access their own resources
- Admin override for legitimate administrative access
- Detailed logging of access attempts

### Permission Hierarchy
- Roles inherit permissions from lower roles
- Super admins have all permissions
- Clear separation between user, admin, and super admin capabilities

### Audit Logging
- All authorization events are logged
- Failed access attempts are tracked
- Administrative actions are recorded

## Implementation Notes

### Middleware Order
Apply middleware in this order:
1. Authentication (`jwtAuth`)
2. Authorization info (`addUserAuthorization`)
3. Permission checks (`requirePermission`, `requireAdmin`)
4. Resource ownership (`validateResourceOwnership`)
5. Route handler

### Error Handling
- Unauthorized access returns 403 Forbidden
- Missing authentication returns 401 Unauthorized
- Clear error messages without exposing sensitive information

### Performance
- Role and permission checks are lightweight
- Database queries only when necessary for resource validation
- Caching can be added for frequently accessed permissions

## Future Enhancements

1. **Database-Stored Roles**: Move role assignment to database tables
2. **Dynamic Permissions**: Allow runtime permission assignment
3. **Team-Based Permissions**: Implement team-specific roles and permissions
4. **API Key Authentication**: Support service-to-service authentication
5. **Permission Caching**: Cache user permissions for better performance
6. **Audit Dashboard**: Web interface for viewing security events