# Plan WebSocket Service

## Overview

The Plan WebSocket Service provides real-time synchronization for action plan modifications across multiple clients. It enables collaborative features and instant updates when users modify tasks, reorder items, or update progress.

## Features

- **JWT Authentication**: Secure WebSocket connections using JWT access tokens
- **Room-Based Messaging**: Isolated communication channels per action plan
- **Real-Time Updates**: Instant broadcasting of task changes to all participants
- **Connection Management**: Automatic reconnection with exponential backoff
- **Presence Tracking**: Monitor active participants in each plan room
- **Lifecycle Management**: Proper cleanup of inactive rooms and connections

## Architecture

### Server-Side Components

#### PlanWebSocketService

Main service class that manages WebSocket connections and room-based messaging.

**Key Methods:**

- `authenticateConnection(ws, req)` - Authenticate WebSocket connection using JWT
- `handleConnection(ws, user)` - Set up message handlers for authenticated connection
- `broadcastTaskUpdate(planId, task, userId)` - Broadcast task update to room
- `broadcastTaskCreated(planId, task, userId)` - Broadcast task creation to room
- `broadcastTaskDeleted(planId, taskId, userId)` - Broadcast task deletion to room
- `broadcastTaskReordered(planId, taskIds, userId)` - Broadcast task reordering to room
- `broadcastProgressUpdate(planId, progress, userId)` - Broadcast progress update to room
- `getRoomInfo(planId)` - Get information about a specific room
- `getAllRooms()` - Get list of all active rooms
- `shutdown()` - Clean shutdown of service

### Client-Side Components

#### usePlanWebSocket Hook

React hook for managing WebSocket connections in action plan components.

**Usage:**

```typescript
import { usePlanWebSocket } from '@/hooks/usePlanWebSocket';

function ActionPlanView({ planId }: { planId: string }) {
  const { isConnected, participantCount } = usePlanWebSocket({
    planId,
    enabled: true,
    onTaskUpdated: (task) => {
      console.log('Task updated:', task);
    },
    onTaskCreated: (task) => {
      console.log('Task created:', task);
    },
    onTaskDeleted: (taskId) => {
      console.log('Task deleted:', taskId);
    },
    onUserJoined: (data) => {
      console.log('User joined:', data.userName);
    },
    onUserLeft: (data) => {
      console.log('User left');
    },
  });

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Participants: {participantCount}</div>
      {/* Plan content */}
    </div>
  );
}
```

## Message Protocol

### Client to Server Messages

#### Join Plan Room

```json
{
  "type": "join-plan",
  "planId": "123"
}
```

#### Leave Plan Room

```json
{
  "type": "leave-plan",
  "planId": "123"
}
```

#### Ping (Keep-Alive)

```json
{
  "type": "ping"
}
```

### Server to Client Messages

#### Connection Confirmation

```json
{
  "type": "pong",
  "data": {
    "userId": 1,
    "connected": true,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Join Plan Confirmation

```json
{
  "type": "join-plan",
  "planId": "123",
  "data": {
    "success": true,
    "participantCount": 2,
    "participants": [
      { "userId": 1, "userName": "user1" },
      { "userId": 2, "userName": "user2" }
    ]
  }
}
```

#### User Joined Notification

```json
{
  "type": "join-plan",
  "planId": "123",
  "data": {
    "userId": 2,
    "userName": "user2",
    "participantCount": 2
  }
}
```

#### User Left Notification

```json
{
  "type": "leave-plan",
  "planId": "123",
  "data": {
    "userId": 2,
    "participantCount": 1
  }
}
```

#### Task Updated

```json
{
  "type": "task-updated",
  "planId": "123",
  "data": {
    "task": {
      "id": 1,
      "title": "Updated Task",
      "status": "completed",
      ...
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Task Created

```json
{
  "type": "task-created",
  "planId": "123",
  "data": {
    "task": {
      "id": 2,
      "title": "New Task",
      "status": "not_started",
      ...
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Task Deleted

```json
{
  "type": "task-deleted",
  "planId": "123",
  "data": {
    "taskId": "1"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Task Reordered

```json
{
  "type": "task-reordered",
  "planId": "123",
  "data": {
    "taskIds": ["3", "1", "2"]
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Progress Updated

```json
{
  "type": "progress-updated",
  "planId": "123",
  "data": {
    "progress": {
      "totalTasks": 10,
      "completedTasks": 5,
      "completionPercentage": 50
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Authentication

WebSocket connections are authenticated using JWT access tokens. The token can be provided in two ways:

1. **Query Parameter** (recommended for browser clients):
   ```
   ws://localhost:5000/ws?token=<access_token>
   ```

2. **Authorization Header** (for programmatic clients):
   ```
   Authorization: Bearer <access_token>
   ```

The service validates the token using the JWT service and extracts user information (userId, email, userName).

## Connection Lifecycle

### Connection Flow

1. Client initiates WebSocket connection with JWT token
2. Server authenticates the connection
3. Server sends connection confirmation
4. Client sends `join-plan` message to join a specific plan room
5. Server adds client to room and broadcasts join notification
6. Client receives real-time updates for that plan
7. Client sends `leave-plan` message or disconnects
8. Server removes client from room and broadcasts leave notification

### Reconnection Strategy

The client hook implements automatic reconnection with exponential backoff:

- Initial reconnection delay: 1 second
- Maximum reconnection delay: 30 seconds
- Maximum reconnection attempts: 5
- Backoff formula: `min(1000 * 2^attempt, 30000)`

### Keep-Alive

The client sends ping messages every 30 seconds to keep the connection alive and detect disconnections early.

## Room Management

### Room Creation

Rooms are created automatically when the first user joins a plan. Each room is identified by the plan ID.

### Participant Tracking

The service tracks all participants in each room, including:
- User ID
- User name
- Email
- WebSocket connection
- Join timestamp
- Last activity timestamp

### Room Cleanup

Inactive rooms are automatically cleaned up:
- Participants inactive for >30 minutes are removed
- Empty rooms inactive for >30 minutes are deleted
- Cleanup runs every 5 minutes

## Integration with API Routes

The WebSocket service is integrated with the API routes to broadcast updates:

### Task Routes (`server/routes/tasks.ts`)

- `PATCH /api/tasks/:taskId` - Broadcasts task update
- `DELETE /api/tasks/:taskId` - Broadcasts task deletion

### Plan Routes (`server/routes/plans.ts`)

- `POST /api/plans/:planId/tasks` - Broadcasts task creation
- `POST /api/plans/:planId/tasks/reorder` - Broadcasts task reordering

## Performance Considerations

### Scalability

- Supports multiple connections per user (e.g., multiple browser tabs)
- Efficient room-based broadcasting (only sends to relevant participants)
- Automatic cleanup of inactive connections and rooms

### Message Optimization

- Only broadcasts to participants with open connections
- Excludes the user who initiated the change (they already have the update)
- Uses JSON serialization for efficient message transmission

### Error Handling

- Graceful handling of connection errors
- Automatic reconnection on connection loss
- Validation of all incoming messages
- Logging of errors for debugging

## Testing

The service includes comprehensive unit tests covering:

- Authentication with valid/invalid tokens
- Room creation and participant tracking
- Message broadcasting
- Connection lifecycle management
- Cleanup and shutdown

Run tests:
```bash
npm test -- server/services/__tests__/planWebSocketService.test.ts --run
```

## Monitoring

### Metrics to Track

- Active connections count
- Active rooms count
- Messages sent per second
- Connection errors
- Reconnection attempts
- Average room size

### Logging

The service logs important events:
- User connections/disconnections
- Room joins/leaves
- Broadcast operations
- Errors and warnings

## Security

### Authentication

- All connections must provide a valid JWT access token
- Tokens are validated using the JWT service
- Invalid tokens result in immediate connection closure

### Authorization

- Users can only join rooms for plans they have access to
- Room access is controlled by plan ownership (verified in API routes)
- No cross-room message leakage

### Data Protection

- Messages are transmitted over WebSocket (can be upgraded to WSS for encryption)
- No sensitive data is stored in the WebSocket service
- All data is fetched from the database with proper authorization

## Future Enhancements

### Phase 2 Features

1. **Presence Indicators**: Show which users are currently viewing/editing tasks
2. **Cursor Sharing**: Display real-time cursor positions for collaborative editing
3. **Conflict Resolution**: Handle concurrent edits with operational transformation
4. **Message Persistence**: Store messages for offline users
5. **Typing Indicators**: Show when users are typing in task descriptions
6. **Read Receipts**: Track which users have seen updates
7. **Push Notifications**: Send browser notifications for important updates

### Performance Optimizations

1. **Redis Pub/Sub**: Scale across multiple server instances
2. **Message Batching**: Combine multiple updates into single broadcast
3. **Compression**: Compress large messages
4. **Binary Protocol**: Use binary format for efficiency

## Troubleshooting

### Connection Issues

**Problem**: WebSocket connection fails to establish

**Solutions**:
- Verify JWT token is valid and not expired
- Check WebSocket URL is correct
- Ensure firewall allows WebSocket connections
- Check browser console for errors

**Problem**: Connection drops frequently

**Solutions**:
- Check network stability
- Verify keep-alive pings are being sent
- Increase reconnection timeout
- Check server logs for errors

### Message Issues

**Problem**: Updates not received in real-time

**Solutions**:
- Verify user has joined the plan room
- Check WebSocket connection is open
- Verify API routes are broadcasting updates
- Check browser console for errors

**Problem**: Duplicate messages received

**Solutions**:
- Ensure only one WebSocket connection per tab
- Check for multiple `usePlanWebSocket` hook instances
- Verify message deduplication logic

## References

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library Documentation](https://github.com/websockets/ws)
- [JWT Authentication](https://jwt.io/)
- [React Hooks](https://react.dev/reference/react)
- [TanStack Query](https://tanstack.com/query/latest)

## Support

For issues or questions:
1. Check this documentation
2. Review test files for examples
3. Check server logs for errors
4. Create an issue in the project repository
