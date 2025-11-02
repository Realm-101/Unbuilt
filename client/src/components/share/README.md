# Share System Components

## Overview
The share system allows users to create secure, shareable links for their analyses. Recipients can view the analysis without authentication.

## Components

### ShareDialog
A comprehensive modal dialog for managing share links.

#### Usage
```tsx
import { ShareDialog } from '@/components/share';

function MyComponent() {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShareDialogOpen(true)}>
        Share Analysis
      </Button>
      
      <ShareDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        analysisId={123}
        analysisTitle="My Innovation Gap Analysis"
      />
    </>
  );
}
```

#### Props
- `isOpen: boolean` - Controls dialog visibility
- `onClose: () => void` - Callback when dialog is closed
- `analysisId: number` - ID of the analysis to share
- `analysisTitle?: string` - Optional title to display in dialog

#### Features
- Create new share links with optional expiration
- View all existing share links
- Copy links to clipboard
- View analytics (view count, dates)
- Revoke access
- Update expiration dates

## Public Share View
The public share view (`/share/:token`) displays analyses without requiring authentication.

### Features
- Read-only analysis display
- View tracking
- Call-to-action for non-users
- Graceful error handling

### URL Format
```
https://yourdomain.com/share/abc123def456...
```

## API Endpoints

### Create Share Link
```typescript
POST /api/share/:analysisId
Body: { expiresAt?: string } // ISO date string
Response: { shareLink, shareUrl }
```

### List User's Share Links
```typescript
GET /api/share/links
Response: ShareLink[]
```

### Access Shared Analysis (Public)
```typescript
GET /api/share/:token
Response: { search, results, shareInfo, isOwner }
```

### Revoke Share Link
```typescript
DELETE /api/share/links/:linkId
Response: { message }
```

### Update Share Link
```typescript
PATCH /api/share/links/:linkId
Body: { expiresAt?: string | null, active?: boolean }
Response: { shareLink, message }
```

## Security

### Token Generation
- 32-byte cryptographically secure random tokens
- 64-character hexadecimal strings
- Collision probability: ~1 in 10^77

### Access Control
- Only link creator can manage links
- Public access requires valid, non-expired token
- Rate limiting prevents abuse

### Expiration
- Optional expiration dates
- Automatic enforcement on access
- Can be updated after creation

## Integration Example

### In Analysis Detail Page
```tsx
import { useState } from 'react';
import { ShareDialog } from '@/components/share';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

export default function AnalysisDetailPage() {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const analysisId = 123; // From route params or props
  
  return (
    <div>
      {/* Analysis content */}
      
      <Button onClick={() => setShareDialogOpen(true)}>
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      
      <ShareDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        analysisId={analysisId}
        analysisTitle="My Analysis"
      />
    </div>
  );
}
```

## Best Practices

### Link Management
- Set expiration dates for sensitive analyses
- Regularly review and revoke unused links
- Monitor view counts for unusual activity

### User Experience
- Provide clear feedback when copying links
- Show link status (active, expired, revoked)
- Display analytics to help users understand reach

### Security
- Don't share links in public forums
- Use expiration dates for temporary sharing
- Revoke links when no longer needed

## Troubleshooting

### Link Not Working
- Check if link has expired
- Verify link is still active (not revoked)
- Ensure token is complete (64 characters)

### View Count Not Updating
- Views are tracked on each access
- Check network tab for API calls
- Verify backend is running

### Can't Create Link
- Verify user owns the analysis
- Check rate limiting status
- Ensure analysis exists
