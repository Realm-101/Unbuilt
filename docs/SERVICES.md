# Service Documentation

This document provides comprehensive documentation for all active services in the application.

---

## Table of Contents

1. [Perplexity Service](#perplexity-service)
2. [PDF Generator Service](#pdf-generator-service)
3. [Email Service](#email-service)
4. [Service Status Overview](#service-status-overview)

---

## Perplexity Service

**File:** `server/services/perplexity.ts`  
**Status:** ✅ Active  
**Version:** 1.0  
**Last Updated:** October 2025

### Overview

The Perplexity service provides real-time market research and trend analysis using the Perplexity AI API. It's designed to discover untapped business opportunities and market gaps by leveraging Perplexity's online search capabilities and AI analysis.

### Purpose

- Identify market gaps and business opportunities
- Analyze market trends and consumer needs
- Provide structured, actionable market intelligence
- Support the gap analysis feature with real-time data

### Architecture

```
┌─────────────────┐
│   API Route     │
│  /api/search    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gemini Service │
│  analyzeGaps()  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Perplexity Service  │
│ discoverMarketGaps()│
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Perplexity AI API  │
│  (External Service) │
└─────────────────────┘
```

### API Reference

#### `discoverMarketGaps(query: string): Promise<MarketGap[]>`

Discovers market gaps and business opportunities based on a search query.

**Parameters:**
- `query` (string) - The market research query or topic to analyze

**Returns:**
- `Promise<MarketGap[]>` - Array of market gap opportunities

**Example:**
```typescript
import { discoverMarketGaps } from './services/perplexity';

const gaps = await discoverMarketGaps('AI-powered healthcare solutions');

console.log(gaps);
// [
//   {
//     title: "AI Health Companion for Chronic Conditions",
//     description: "24/7 AI-powered health monitoring...",
//     category: "Tech That's Missing",
//     feasibility: "high",
//     marketPotential: "high",
//     innovationScore: 8,
//     marketSize: "$4.2B",
//     gapReason: "Privacy concerns and regulatory approval...",
//     targetAudience: "Chronic disease patients...",
//     keyTrends: ["Aging population", "AI in healthcare"]
//   }
// ]
```

### Data Types

#### `MarketGap` Interface

```typescript
export interface MarketGap {
  title: string;                                    // Name of the opportunity
  description: string;                              // Detailed explanation
  category: string;                                 // Category classification
  feasibility: 'high' | 'medium' | 'low';          // Technical feasibility
  marketPotential: 'high' | 'medium' | 'low';      // Market opportunity size
  innovationScore: number;                          // 1-10 innovation rating
  marketSize: string;                               // TAM estimate (e.g., "$2.3B")
  gapReason: string;                                // Why it doesn't exist yet
  competitors?: string[];                           // Optional: Existing competitors
  targetAudience?: string;                          // Optional: Target users
  keyTrends?: string[];                             // Optional: Supporting trends
}
```

#### Categories

The service classifies opportunities into four categories:
- **"Tech That's Missing"** - Technology solutions not yet built
- **"Services That Don't Exist"** - Service businesses with unmet demand
- **"Products Nobody's Made"** - Physical or digital products needed
- **"Business Models"** - New ways to monetize or deliver value

### Configuration

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PERPLEXITY_API_KEY` | Optional | API key for Perplexity AI service |

**Setup:**
```bash
# Add to .env file
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

**Getting an API Key:**
1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for an API account
3. Generate an API key from the dashboard
4. Add the key to your environment configuration

#### API Configuration

The service uses the following Perplexity API settings:
- **Model:** `llama-3.1-sonar-large-128k-online`
- **Endpoint:** `https://api.perplexity.ai/chat/completions`
- **Temperature:** 0.7
- **Max Tokens:** 4000
- **Search Recency:** Last month
- **Citations:** Enabled

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.11.0 | HTTP client for API requests |

**Installation:**
```bash
npm install axios
```

### Error Handling

The service implements robust error handling:

1. **Missing API Key**
   - Falls back to demo data
   - Logs warning message
   - Continues operation without API

2. **API Request Failure**
   - Catches axios errors
   - Logs error details
   - Returns fallback data

3. **JSON Parse Errors**
   - Handles malformed responses
   - Cleans markdown code blocks
   - Falls back to demo data

**Example Error Handling:**
```typescript
try {
  const gaps = await discoverMarketGaps('market research query');
  // Process gaps
} catch (error) {
  console.error('Failed to discover market gaps:', error);
  // Service automatically provides fallback data
}
```

### Fallback Mechanism

When the API is unavailable or not configured, the service provides intelligent fallback data:

- **Query-Aware Fallbacks** - Returns relevant demo data based on query keywords
- **Domain-Specific Data** - Provides specialized examples for health, education, etc.
- **General Opportunities** - Includes diverse market gaps when no specific match

**Fallback Categories:**
- Health/Medical queries → Healthcare-related opportunities
- Education/Learning queries → EdTech opportunities
- General queries → Mixed category opportunities

### Performance Considerations

- **Response Time:** Typically 2-5 seconds for API calls
- **Caching:** Results are cached by the Gemini service layer
- **Rate Limiting:** Subject to Perplexity API rate limits
- **Fallback Speed:** Instant (no API call required)

### Integration Guide

#### Basic Integration

```typescript
import { discoverMarketGaps, type MarketGap } from './services/perplexity';

async function analyzeMarket(userQuery: string) {
  try {
    const opportunities = await discoverMarketGaps(userQuery);
    
    // Filter high-potential opportunities
    const highPotential = opportunities.filter(
      gap => gap.marketPotential === 'high' && gap.feasibility === 'high'
    );
    
    return highPotential;
  } catch (error) {
    console.error('Market analysis failed:', error);
    throw error;
  }
}
```

#### With Caching

```typescript
import { discoverMarketGaps } from './services/perplexity';
import { aiCache } from './services/ai-cache';

async function getCachedMarketGaps(query: string) {
  // Check cache first
  const cached = aiCache.get(query);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const gaps = await discoverMarketGaps(query);
  
  // Cache results
  aiCache.set(query, gaps);
  
  return gaps;
}
```

#### With Error Recovery

```typescript
import { discoverMarketGaps } from './services/perplexity';

async function robustMarketAnalysis(query: string) {
  try {
    const gaps = await discoverMarketGaps(query);
    
    if (gaps.length === 0) {
      throw new Error('No opportunities found');
    }
    
    return {
      success: true,
      data: gaps,
      source: 'perplexity'
    };
  } catch (error) {
    console.warn('Perplexity failed, using fallback');
    
    return {
      success: false,
      data: [],
      source: 'fallback',
      error: error.message
    };
  }
}
```

### Testing

#### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { discoverMarketGaps } from './perplexity';

describe('Perplexity Service', () => {
  it('should return market gaps for valid query', async () => {
    const gaps = await discoverMarketGaps('AI healthcare');
    
    expect(gaps).toBeInstanceOf(Array);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]).toHaveProperty('title');
    expect(gaps[0]).toHaveProperty('marketSize');
  });
  
  it('should handle missing API key gracefully', async () => {
    // API key not configured in test environment
    const gaps = await discoverMarketGaps('test query');
    
    // Should return fallback data
    expect(gaps).toBeInstanceOf(Array);
    expect(gaps.length).toBeGreaterThan(0);
  });
});
```

### Monitoring

#### Key Metrics to Track

- API response time
- API success/failure rate
- Fallback usage frequency
- Cache hit rate
- Query patterns

#### Logging

The service logs important events:
```typescript
// API key missing
console.warn('⚠️ Perplexity API key not configured - using fallback data');

// API errors
console.error('Perplexity API error:', error);
console.error('Response data:', error.response?.data);

// Parse errors
console.error('Error parsing Perplexity response:', parseError);
console.error('Raw content:', content);
```

### Troubleshooting

#### Common Issues

**1. API Key Not Working**
```
Error: 401 Unauthorized
```
**Solution:** Verify API key is correct and active in Perplexity dashboard

**2. Rate Limit Exceeded**
```
Error: 429 Too Many Requests
```
**Solution:** Implement request throttling or upgrade API plan

**3. Timeout Errors**
```
Error: ETIMEDOUT
```
**Solution:** Increase axios timeout or check network connectivity

**4. Invalid JSON Response**
```
Error: Unexpected token in JSON
```
**Solution:** Service automatically handles this with fallback data

#### Debug Mode

Enable detailed logging:
```typescript
// Set environment variable
DEBUG=perplexity:*

// Or add console logs
console.log('Perplexity request:', { query, model, temperature });
console.log('Perplexity response:', response.data);
```

### Security Considerations

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys periodically

2. **Input Validation**
   - Validate query strings before API calls
   - Sanitize user input
   - Limit query length

3. **Rate Limiting**
   - Implement application-level rate limiting
   - Monitor API usage
   - Set up alerts for unusual patterns

### Future Enhancements

Potential improvements for future versions:

- [ ] Add request caching at service level
- [ ] Implement retry logic with exponential backoff
- [ ] Add support for multiple Perplexity models
- [ ] Include citation tracking and source attribution
- [ ] Add streaming response support
- [ ] Implement query optimization
- [ ] Add A/B testing for different prompts
- [ ] Create analytics dashboard for service usage

### Related Services

- **Gemini Service** (`server/services/gemini.ts`) - Primary consumer, provides fallback
- **AI Cache** (`server/services/ai-cache.ts`) - Caches results to reduce API calls

### Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review [Perplexity API documentation](https://docs.perplexity.ai/)
- Contact the development team

---

## PDF Generator Service

**File:** `server/services/pdf-generator.ts`  
**Status:** ✅ Active  
**Version:** 1.0  
**Last Updated:** October 2025

### Overview

The PDF Generator service creates professional HTML reports from market gap analysis results. These reports can be downloaded as HTML files (printable to PDF via browser) and exported in multiple formats tailored for different audiences.

### Purpose

- Generate professional market analysis reports
- Support multiple report formats (Executive, Pitch Deck, Detailed)
- Enable users to share analysis results with stakeholders
- Provide customizable branding and content options
- Part of Pro plan feature set for premium formats

### Architecture

```
┌──────────────────┐
│  Export Modal    │
│  (Frontend UI)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   POST /api/export│
│  (Protected Route)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  exportResults() │
│  exportPdf()     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  PDF Generator       │
│  generateHTML()      │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  HTML Report File    │
│  (Download/Print)    │
└──────────────────────┘
```

### API Reference

#### `generateHTML(results: SearchResult[], options: PDFOptions): string`

Generates a professional HTML report from search results.

**Parameters:**
- `results` (SearchResult[]) - Array of market gap analysis results
- `options` (PDFOptions) - Report customization options

**Returns:**
- `string` - Complete HTML document ready for download/printing

**Example:**
```typescript
import { pdfGenerator, PDFOptions } from './services/pdf-generator';

const options: PDFOptions = {
  format: 'executive',
  customTitle: 'Q4 2025 Market Analysis',
  customIntro: 'This report analyzes emerging opportunities in AI healthcare.',
  includeDetails: true,
  companyName: 'Acme Corp',
  authorName: 'Jane Smith'
};

const html = pdfGenerator.generateHTML(results, options);

// Send as download
res.setHeader('Content-Type', 'text/html');
res.setHeader('Content-Disposition', 'attachment; filename="report.html"');
res.send(html);
```

### Data Types

#### `PDFOptions` Interface

```typescript
export interface PDFOptions {
  format: 'executive' | 'pitch' | 'detailed';
  customTitle?: string;
  customIntro?: string;
  includeDetails?: boolean;
  companyName?: string;
  authorName?: string;
}
```

**Fields:**
- `format` - Report format type
  - `executive` - Executive summary with strategic overview
  - `pitch` - Investor pitch deck format with top opportunities
  - `detailed` - Comprehensive analysis with all data
- `customTitle` - Optional custom report title
- `customIntro` - Optional executive summary/introduction text
- `includeDetails` - Whether to include detailed analysis (default: true)
- `companyName` - Optional company name for branding
- `authorName` - Optional author attribution

### Report Formats

#### Executive Format
- Market Analysis Overview with key statistics
- Strategic Opportunities section with all results
- Opportunities by Category breakdown
- Professional styling for C-level audience

#### Pitch Format
- Eye-catching market opportunity headline
- Top 3 innovation opportunities (sorted by score)
- Call-to-action section
- Investor-focused presentation style

#### Detailed Format
- Combines executive summary
- Full strategic opportunities listing
- Category breakdowns
- Comprehensive data visualization

### Features

#### Statistics Calculated
- Total opportunities count
- Average innovation score
- High feasibility percentage
- High potential percentage
- Combined market size (aggregated)
- Category distribution

#### Styling & Design
- Modern, responsive HTML/CSS
- UNBUILT branding with gradient colors
- Print-optimized layouts with page breaks
- Professional typography (Inter font)
- Color-coded metrics (high/medium/low)
- Hover effects and visual polish

#### Customization
- Custom report titles
- Custom introductions/executive summaries
- Company name and author attribution
- Configurable detail levels
- Format-specific content

### Integration Points

#### Frontend UI
**Component:** `client/src/components/export-modal.tsx`

The export modal provides a comprehensive UI for users to:
- Select export format (PDF, CSV, Pitch, Executive)
- Customize report title and introduction
- Choose detail level
- Preview format descriptions
- Access premium formats (Pro plan required)

**Premium Features:**
- Pitch Deck format (Pro only)
- Executive Summary format (Pro only)
- Custom branding options

#### API Endpoint
**Route:** `POST /api/export`
- Protected with JWT authentication
- Rate limited to prevent abuse
- Accepts format, result IDs, and options
- Returns HTML file for download

**Request Body:**
```typescript
{
  format: 'executive' | 'pitch' | 'detailed' | 'csv',
  results: number[],  // Array of result IDs
  options: {
    includeDetails: boolean,
    customTitle: string,
    customIntro: string,
    companyName?: string,
    authorName?: string
  }
}
```

**Response:**
- Content-Type: `text/html`
- Content-Disposition: `attachment; filename="report.html"`
- Body: Complete HTML document

### Usage Examples

#### Basic Export
```typescript
// In route handler
const results = await Promise.all(
  resultIds.map(id => storage.getSearchResultById(id))
);

const pdfOptions: PDFOptions = {
  format: 'detailed',
  customTitle: 'Market Gap Analysis Report'
};

const html = pdfGenerator.generateHTML(results, pdfOptions);

res.setHeader('Content-Type', 'text/html');
res.send(html);
```

#### Executive Summary
```typescript
const pdfOptions: PDFOptions = {
  format: 'executive',
  customTitle: 'Q4 2025 Strategic Opportunities',
  customIntro: 'This executive summary highlights key market gaps identified in our analysis.',
  companyName: 'Acme Corporation',
  authorName: 'Strategy Team'
};

const html = pdfGenerator.generateHTML(results, pdfOptions);
```

#### Investor Pitch
```typescript
const pdfOptions: PDFOptions = {
  format: 'pitch',
  customTitle: 'Innovation Opportunity Pitch',
  customIntro: 'We have identified $50M+ in untapped market opportunities.',
  includeDetails: false  // Focus on highlights only
};

const html = pdfGenerator.generateHTML(results, pdfOptions);
```

### Dependencies

**Internal:**
- `@shared/schema` - SearchResult type definition

**External:**
- None - Pure TypeScript/HTML generation
- No API keys or external services required
- No rate limits or usage costs

### Configuration

No environment variables required. The service works out of the box with no configuration.

### Error Handling

The service is designed to be robust:
- Handles empty result arrays gracefully
- Provides default values for missing optional fields
- Safely parses market size strings
- Falls back to 0 for unparseable values

### Performance

- **Generation Time:** <100ms for typical reports (10-20 results)
- **Output Size:** 50-200KB HTML (depending on result count)
- **Memory Usage:** Minimal (string concatenation only)
- **Scalability:** Can handle 100+ results without issues

### Best Practices

1. **Validate Results:** Ensure results array is not empty before generating
2. **Sanitize Input:** Custom titles and intros should be sanitized if user-provided
3. **Format Selection:** Guide users to appropriate format for their use case
4. **File Naming:** Use descriptive filenames with timestamps
5. **Browser Printing:** Instruct users to use browser's "Print to PDF" feature

### Troubleshooting

#### Issue: Report looks broken when printed
**Solution:** Ensure browser print settings use:
- Portrait orientation
- Normal margins
- Background graphics enabled

#### Issue: Large reports are slow to generate
**Solution:** Consider pagination or limiting results to top N opportunities

#### Issue: Custom intro text breaks layout
**Solution:** Limit intro text to 500 characters or add text truncation

### Future Enhancements

Potential improvements for future versions:
- Server-side PDF rendering (using Puppeteer or similar)
- Chart generation (using Chart.js or D3)
- Template system for custom branding
- Multi-language support
- Export to PowerPoint format
- Email delivery integration

### Support

For issues or questions:
- Check the export modal UI for format descriptions
- Review the generated HTML in browser before printing
- Contact the development team for custom format requests

---

## Email Service

**File:** `server/services/email.ts`  
**Status:** ⚠️ Not Yet Integrated  
**Version:** 1.0  
**Last Updated:** October 2025

### Overview

The Email service provides SendGrid integration for sending transactional emails. The service is fully implemented with proper error handling and fallback mechanisms, but is not yet integrated into any active features.

### Purpose

- Send transactional emails (password resets, notifications)
- Provide HTML and text email templates
- Handle email delivery with graceful fallback
- Support future email-based features

### Current Status

**✅ Implemented:**
- SendGrid integration with `@sendgrid/mail` package
- Graceful fallback when API key not configured
- HTML and text email templates for password reset
- Proper error handling and logging
- Type-safe email parameters

**❌ Not Yet Connected:**
- No authentication routes call password reset emails
- Export email feature is stubbed out (doesn't actually send)
- No active imports or usage in the codebase

### API Reference

#### `sendEmail(params: EmailParams): Promise<boolean>`

Sends a generic email using SendGrid.

**Parameters:**
```typescript
interface EmailParams {
  to: string;      // Recipient email address
  from: string;    // Sender email address (must be verified in SendGrid)
  subject: string; // Email subject line
  text?: string;   // Plain text content (optional)
  html?: string;   // HTML content (optional)
}
```

**Returns:**
- `Promise<boolean>` - `true` if email sent successfully, `false` otherwise

**Example:**
```typescript
import { sendEmail } from './services/email';

const success = await sendEmail({
  to: 'user@example.com',
  from: 'noreply@unbuilt.cloud',
  subject: 'Welcome to Unbuilt',
  text: 'Welcome to our platform!',
  html: '<h1>Welcome to our platform!</h1>'
});

if (success) {
  console.log('Email sent successfully');
} else {
  console.log('Email failed to send');
}
```

#### `sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean>`

Sends a password reset email with a branded template.

**Parameters:**
- `email` (string) - Recipient email address
- `resetToken` (string) - Password reset token to include in URL

**Returns:**
- `Promise<boolean>` - `true` if email sent successfully, `false` otherwise

**Example:**
```typescript
import { sendPasswordResetEmail } from './services/email';

// Generate reset token (implementation not shown)
const resetToken = generateResetToken(user.id);

// Send password reset email
const success = await sendPasswordResetEmail(user.email, resetToken);

if (success) {
  res.json({ message: 'Password reset email sent' });
} else {
  res.status(500).json({ error: 'Failed to send email' });
}
```

### Email Templates

#### Password Reset Email

The service includes a professionally designed password reset email with:
- Branded header with gradient background
- Clear call-to-action button
- Security information (1-hour expiration)
- Fallback plain text link
- Responsive HTML design
- Plain text alternative

**Template Features:**
- ✨ Gradient branding (purple to blue)
- 📱 Mobile-responsive design
- 🔒 Security best practices
- 📧 Both HTML and plain text versions
- ⏰ Expiration notice (1 hour)

### Configuration

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | Optional | API key for SendGrid email service |

**Setup:**
```bash
# Add to .env file
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

**Getting an API Key:**
1. Visit [SendGrid](https://sendgrid.com/)
2. Sign up for an account (free tier available)
3. Verify your sender domain or email
4. Generate an API key from Settings → API Keys
5. Add the key to your environment configuration

#### Sender Verification

**Important:** SendGrid requires sender verification before sending emails.

**Options:**
1. **Single Sender Verification** (Quick, for testing)
   - Verify a single email address
   - Good for development/testing
   - Limited to that one sender

2. **Domain Authentication** (Recommended for production)
   - Verify your entire domain
   - Better deliverability
   - Professional appearance
   - Required for production use

**Current Configuration:**
- Default sender: `noreply@unbuilt.cloud`
- **Action Required:** Verify this domain in SendGrid before production use

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @sendgrid/mail | ^8.1.5 | SendGrid email client |

**Installation:**
```bash
npm install @sendgrid/mail
```

### Error Handling

The service implements robust error handling:

1. **Missing API Key**
   - Logs message instead of sending
   - Returns `false` (not an error)
   - Allows development without SendGrid

2. **SendGrid API Errors**
   - Catches and logs errors
   - Returns `false`
   - Doesn't crash the application

3. **Invalid Parameters**
   - TypeScript validation
   - Runtime checks
   - Clear error messages

**Example Error Handling:**
```typescript
try {
  const success = await sendEmail({
    to: 'user@example.com',
    from: 'noreply@unbuilt.cloud',
    subject: 'Test Email',
    html: '<p>Test content</p>'
  });
  
  if (!success) {
    // Email failed but didn't throw error
    console.log('Email service not configured or failed');
  }
} catch (error) {
  // Unexpected error
  console.error('Unexpected email error:', error);
}
```

### Fallback Behavior

When `SENDGRID_API_KEY` is not configured:
```typescript
// Service logs instead of sending
console.log(`Email service not configured - would have sent email to user@example.com with subject: Welcome`);
```

This allows:
- ✅ Development without SendGrid account
- ✅ Testing email logic without sending
- ✅ Graceful degradation in production
- ✅ No application crashes

### Integration Guide

#### Password Reset Flow (Future Implementation)

```typescript
// server/routes/auth.ts (example - not yet implemented)
import { sendPasswordResetEmail } from '../services/email';
import { generateResetToken } from '../utils/tokens';

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If account exists, email sent' });
  }
  
  // Generate reset token
  const resetToken = generateResetToken(user.id);
  
  // Store token in database with expiration
  await db.insert(passwordResets).values({
    userId: user.id,
    token: resetToken,
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  });
  
  // Send email
  const success = await sendPasswordResetEmail(user.email, resetToken);
  
  if (!success) {
    console.warn('Failed to send password reset email');
    // Still return success to user (don't reveal failure)
  }
  
  res.json({ message: 'If account exists, email sent' });
});
```

#### Email Report Feature (Future Implementation)

```typescript
// server/routes/export.ts (example - not yet implemented)
import { sendEmail } from '../services/email';
import { generateReportHTML } from '../utils/reports';

export async function sendEmailReport(req: Request, res: Response) {
  const { email, results: resultIds, options = {} } = req.body;
  
  // Fetch results
  const results = await Promise.all(
    resultIds.map((id: number) => storage.getSearchResultById(id))
  );
  
  // Generate HTML report
  const html = generateReportHTML(results, options);
  
  // Send email
  const success = await sendEmail({
    to: email,
    from: 'noreply@unbuilt.cloud',
    subject: 'Your Market Gap Analysis Report',
    html: html,
    text: 'Your report is attached. Please view in HTML email client.'
  });
  
  if (success) {
    res.json({ success: true, message: 'Report sent successfully' });
  } else {
    res.status(500).json({ error: 'Failed to send report' });
  }
}
```

### Testing

#### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendEmail, sendPasswordResetEmail } from './email';

describe('Email Service', () => {
  it('should return false when API key not configured', async () => {
    // API key not set in test environment
    const result = await sendEmail({
      to: 'test@example.com',
      from: 'noreply@unbuilt.cloud',
      subject: 'Test',
      text: 'Test content'
    });
    
    expect(result).toBe(false);
  });
  
  it('should generate password reset email', async () => {
    const result = await sendPasswordResetEmail(
      'user@example.com',
      'test-token-123'
    );
    
    // Will be false without API key, but shouldn't throw
    expect(typeof result).toBe('boolean');
  });
});
```

### Security Considerations

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables only
   - Rotate keys periodically
   - Use restricted API keys (send-only)

2. **Sender Verification**
   - Always verify sender domains
   - Use dedicated sending domains
   - Monitor sender reputation

3. **Email Content**
   - Sanitize user-provided content
   - Validate email addresses
   - Use HTTPS for all links
   - Include unsubscribe links (for marketing emails)

4. **Rate Limiting**
   - Implement application-level rate limiting
   - Monitor sending patterns
   - Prevent abuse

5. **Token Security**
   - Use cryptographically secure tokens
   - Set short expiration times (1 hour)
   - Invalidate tokens after use
   - Store tokens securely (hashed)

### Future Implementation Tasks

To integrate this service into the application:

- [ ] **Password Reset Flow**
  - Add forgot password endpoint
  - Generate and store reset tokens
  - Call `sendPasswordResetEmail()`
  - Add reset password page
  - Validate and consume tokens

- [ ] **Email Reports**
  - Update `sendEmailReport()` in export routes
  - Import and use `sendEmail()`
  - Generate HTML report content
  - Add email validation

- [ ] **Welcome Emails**
  - Send on user registration
  - Include getting started guide
  - Add email verification link

- [ ] **Notification System**
  - Search result notifications
  - Account activity alerts
  - Feature announcements

### Monitoring

#### Key Metrics to Track

- Email delivery rate
- Bounce rate
- Open rate (if tracking enabled)
- API error rate
- Fallback usage frequency

#### Logging

The service logs important events:
```typescript
// API key missing
console.log('Email service not configured - would have sent email to user@example.com');

// Success
console.log('Email sent successfully to user@example.com');

// Errors
console.error('SendGrid email error:', error);
```

### Troubleshooting

#### Common Issues

**1. API Key Not Working**
```
Error: 401 Unauthorized
```
**Solution:** Verify API key is correct and has send permissions

**2. Sender Not Verified**
```
Error: 403 Forbidden - Sender not verified
```
**Solution:** Verify sender email/domain in SendGrid dashboard

**3. Rate Limit Exceeded**
```
Error: 429 Too Many Requests
```
**Solution:** Upgrade SendGrid plan or implement request throttling

**4. Emails Not Received**
- Check spam folder
- Verify recipient email is valid
- Check SendGrid activity log
- Verify sender domain authentication

### Cost Considerations

**SendGrid Pricing (as of 2025):**
- **Free Tier:** 100 emails/day
- **Essentials:** $19.95/month - 50,000 emails
- **Pro:** $89.95/month - 100,000 emails

**Recommendations:**
- Start with free tier for development
- Monitor usage as you scale
- Implement email batching for efficiency
- Use transactional emails only (not marketing)

### Related Services

- **Authentication** (`server/auth.ts`) - Future consumer for password resets
- **Export Routes** (`server/routes/export.ts`) - Future consumer for email reports

### Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review [SendGrid documentation](https://docs.sendgrid.com/)
- Contact the development team

---

## Service Status Overview

| Service | Status | File | Purpose |
|---------|--------|------|---------|
| Perplexity | ✅ Active | `server/services/perplexity.ts` | Market gap discovery |
| PDF Generator | ✅ Active | `server/services/pdf-generator.ts` | Report export (HTML/PDF) |
| Email | ⚠️ Not Yet Integrated | `server/services/email.ts` | Email notifications (future) |

**Legend:**
- ✅ Active - Currently in use and fully documented
- ⚠️ Not Yet Integrated - Implemented but not connected to features
- ❌ Unused - Marked for removal
- 📝 Planned - Future feature implementation

---

## General Troubleshooting

This section covers common issues that may affect multiple services or the overall service infrastructure.

### Environment Configuration Issues

#### Issue: Environment variables not loading
**Symptoms:**
- Services fall back to demo/mock data
- "API key not configured" warnings in logs
- Features work but use fallback behavior

**Solutions:**
1. Verify `.env` file exists in project root
2. Check variable names match exactly (case-sensitive)
3. Restart the application after changing `.env`
4. In production, verify environment variables are set in deployment platform
5. Use `server/config/envValidator.ts` to validate configuration

**Debug Commands:**
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded (development)
node -e "require('dotenv').config(); console.log(process.env.PERPLEXITY_API_KEY ? 'Loaded' : 'Missing')"
```

#### Issue: Services work in development but fail in production
**Symptoms:**
- Local development works fine
- Production deployment uses fallback data
- No errors in logs

**Solutions:**
1. Verify environment variables are set in production platform (Replit, Heroku, etc.)
2. Check that variable names match between `.env` and production config
3. Ensure API keys are valid and not expired
4. Verify network access from production environment to external APIs
5. Check production logs for specific error messages

### API Integration Issues

#### Issue: External API calls timing out
**Symptoms:**
- Requests take >30 seconds
- `ETIMEDOUT` or `ECONNREFUSED` errors
- Services fall back to demo data

**Solutions:**
1. Check internet connectivity from server
2. Verify API endpoint URLs are correct
3. Check if API service is experiencing downtime (status pages)
4. Increase timeout values in axios configuration
5. Implement retry logic with exponential backoff

**Example Timeout Configuration:**
```typescript
import axios from 'axios';

const api = axios.create({
  timeout: 30000, // 30 seconds
  retry: 3,
  retryDelay: 1000
});
```

#### Issue: Rate limiting errors
**Symptoms:**
- `429 Too Many Requests` errors
- Services work initially then fail
- Errors occur during high traffic

**Solutions:**
1. Implement application-level rate limiting
2. Add caching to reduce API calls
3. Upgrade API plan for higher limits
4. Implement request queuing
5. Use exponential backoff for retries

**Example Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);
```

### Performance Issues

#### Issue: Slow service response times
**Symptoms:**
- API calls take >5 seconds
- Users experience delays
- Timeout errors under load

**Solutions:**
1. **Enable Caching:**
   ```typescript
   import { aiCache } from './services/ai-cache';
   
   // Check cache before API call
   const cached = aiCache.get(query);
   if (cached) return cached;
   
   // Make API call and cache result
   const result = await service.call(query);
   aiCache.set(query, result);
   ```

2. **Implement Request Debouncing:**
   - Prevent duplicate simultaneous requests
   - Use request deduplication
   - Implement client-side debouncing

3. **Optimize Database Queries:**
   - Add indexes for frequently queried fields
   - Use connection pooling
   - Implement query result caching

4. **Monitor Performance:**
   - Track API response times
   - Set up alerts for slow requests
   - Use APM tools (Application Performance Monitoring)

### Security Issues

#### Issue: API keys exposed in logs or errors
**Symptoms:**
- API keys visible in error messages
- Keys logged to console
- Keys in stack traces

**Solutions:**
1. **Sanitize Logs:**
   ```typescript
   const sanitizeError = (error: any) => {
     const sanitized = { ...error };
     delete sanitized.config?.headers?.Authorization;
     delete sanitized.config?.headers?.['api-key'];
     return sanitized;
   };
   
   console.error('API Error:', sanitizeError(error));
   ```

2. **Use Environment Variables:**
   - Never hardcode API keys
   - Use `.env` files (not committed to git)
   - Rotate keys regularly

3. **Implement Key Rotation:**
   - Set up key expiration
   - Use multiple keys for different environments
   - Monitor key usage for anomalies

#### Issue: Unauthorized access to services
**Symptoms:**
- Services called without authentication
- Unauthorized users accessing premium features
- API abuse

**Solutions:**
1. **Implement Authentication:**
   ```typescript
   import { jwtAuth } from './middleware/jwtAuth';
   
   // Protect routes
   app.post('/api/export', jwtAuth, exportHandler);
   ```

2. **Add Authorization Checks:**
   ```typescript
   // Check user plan for premium features
   if (format === 'pitch' || format === 'executive') {
     if (req.user.plan !== 'pro') {
       return res.status(403).json({ 
         error: 'Premium feature requires Pro plan' 
       });
     }
   }
   ```

3. **Implement Rate Limiting:**
   - Limit requests per user
   - Implement IP-based rate limiting
   - Add CAPTCHA for suspicious activity

### Monitoring and Debugging

#### Enabling Debug Mode

**For Perplexity Service:**
```bash
# Set environment variable
DEBUG=perplexity:*

# Or add to .env
DEBUG=perplexity:*
```

**For All Services:**
```bash
# Enable verbose logging
LOG_LEVEL=debug

# Or in code
console.log('Service request:', { service, params, timestamp });
console.log('Service response:', { service, status, duration });
```

#### Monitoring Service Health

**Health Check Endpoint:**
```typescript
// server/routes/health.ts
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY,
      database: await checkDatabaseConnection(),
    }
  };
  
  res.json(health);
});
```

**Logging Best Practices:**
1. Log service calls with timestamps
2. Log errors with full context
3. Use structured logging (JSON format)
4. Implement log levels (debug, info, warn, error)
5. Set up log aggregation (e.g., Logtail, Papertrail)

#### Common Error Patterns

**Pattern 1: Intermittent Failures**
```
Service works sometimes, fails randomly
```
**Likely Causes:**
- Network instability
- API rate limiting
- Concurrent request issues
- Memory leaks

**Pattern 2: Consistent Failures After Deployment**
```
Service worked before deployment, now fails
```
**Likely Causes:**
- Environment variables not set in production
- API keys not migrated
- Network/firewall restrictions
- Dependency version mismatches

**Pattern 3: Slow Performance Over Time**
```
Service starts fast, gets slower
```
**Likely Causes:**
- Memory leaks
- Cache not expiring
- Database connection pool exhaustion
- Unhandled promise rejections

### Getting Help

#### Before Requesting Support

1. **Check Service Status:**
   - Perplexity: https://status.perplexity.ai/
   - SendGrid: https://status.sendgrid.com/

2. **Review Logs:**
   - Check application logs for errors
   - Review API response logs
   - Check system resource usage

3. **Verify Configuration:**
   - Confirm environment variables are set
   - Verify API keys are valid
   - Check service quotas and limits

4. **Test in Isolation:**
   - Test service independently
   - Use curl or Postman to test APIs directly
   - Verify network connectivity

#### Support Resources

- **Documentation:** This file and related docs in `/docs`
- **API Documentation:**
  - Perplexity: https://docs.perplexity.ai/
  - SendGrid: https://docs.sendgrid.com/
- **Community:** GitHub Issues, Stack Overflow
- **Development Team:** Contact via project repository

#### Reporting Issues

When reporting service issues, include:
1. Service name and version
2. Error messages (full stack trace)
3. Steps to reproduce
4. Environment (development/production)
5. Recent changes or deployments
6. Relevant configuration (sanitized, no API keys)

**Example Issue Report:**
```markdown
**Service:** Perplexity Service
**Environment:** Production
**Error:** 429 Too Many Requests

**Steps to Reproduce:**
1. User searches for "AI healthcare"
2. Service makes API call to Perplexity
3. Receives 429 error after 10 requests

**Logs:**
```
[2025-10-03 14:23:45] Perplexity API error: 429
[2025-10-03 14:23:45] Rate limit exceeded: 10/10 requests used
```

**Recent Changes:**
- Deployed new search feature yesterday
- Increased traffic by 3x

**Configuration:**
- PERPLEXITY_API_KEY: Set (verified)
- Cache: Enabled
- Rate limiting: Not implemented
```

---

**Last Updated:** October 3, 2025  
**Maintained By:** Development Team  
**Version:** 1.0
