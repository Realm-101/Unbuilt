# Comprehensive Testing Plan - Unbuilt App

**Status:** Ready to Execute  
**Date:** October 29, 2025  
**Testing Target:** http://localhost:5000 (Local Development)  
**Production Target:** https://unbuilt.one (After local validation)  
**Estimated Duration:** 8-10 hours

---

## 🎯 Testing Objectives

1. **Feature Validation** - Verify all documented features work as described in USER_GUIDE.md
2. **User Journey Testing** - Validate complete user flows from onboarding to advanced features
3. **Accessibility Compliance** - Ensure WCAG 2.1 AA compliance
4. **Visual Consistency** - Verify "Neon Flame" theme and responsive design
5. **Performance Validation** - Test load times, API responses, and caching
6. **Security Testing** - Validate authentication, authorization, and security features
7. **Documentation Accuracy** - Ensure docs match actual implementation

---

## 🛠️ Active MCP Servers

### Enabled & Auto-Approved:
- ✅ **Chrome DevTools** (27 tools) - Performance, network, console monitoring
- ✅ **Playwright** (32 tools) - Browser automation, E2E testing
- ✅ **Accessibility Scanner** - WCAG compliance testing
- ✅ **Browserbase** - Cloud browser automation, parallel sessions
- ✅ **Fetch** - Web content retrieval
- ✅ **Context7** - Documentation lookup
- ✅ **VibeCheck** - Decision support and validation
- ✅ **Toolbox** - MCP server discovery
- ✅ **Magic MCP** - UI component generation

### Available but Disabled:
- ⚠️ **Neon** - Database operations (can enable if needed)
- ⚠️ **Shadcn** - UI component management (can enable if needed)

---

## 📋 Testing Phases

### Phase 1: Environment Setup & Validation ⏱️ 30 min

**Objectives:**
- Verify app is accessible at https://unbuilt.one
- Confirm all services are running
- Establish baseline metrics
- Take baseline screenshots

**Test Cases:**

1. **Initial Access**
   - Navigate to https://unbuilt.one
   - Verify page loads without errors
   - Check for console errors
   - Validate page load time (<3s requirement)

2. **Service Health**
   - Test API endpoint availability
   - Verify database connectivity
   - Check Redis cache status
   - Validate WebSocket connections (if any)

3. **Baseline Screenshots**
   - Homepage
   - Login page
   - Dashboard (after auth)
   - Search results page
   - Resource library
   - Settings page

**MCP Servers:** Playwright, Chrome DevTools, Fetch

**Success Criteria:**
- ✅ App loads in <3 seconds
- ✅ No console errors
- ✅ All services respond
- ✅ Baseline screenshots captured

---

### Phase 2: Authentication & Authorization Testing ⏱️ 45 min

**Reference:** USER_GUIDE.md - "Getting Started" section

**Test Cases:**

#### 2.1 User Registration
- Navigate to signup page
- Test form validation:
  - Empty fields
  - Invalid email format
  - Weak password (< 8 chars)
  - Password without complexity
- Fill valid registration data
- Submit and verify account creation
- Check email verification flow (if applicable)

#### 2.2 User Login
- Test with valid credentials
- Test with invalid email
- Test with invalid password
- Verify rate limiting (5 failed attempts)
- Check account lockout behavior
- Validate JWT token generation
- Verify session creation

#### 2.3 Password Security
- Test password change functionality
- Verify password history tracking
- Test password complexity requirements:
  - Minimum 8 characters
  - Mix of upper/lowercase
  - Numbers and special characters
- Validate account lockout after failed attempts

#### 2.4 Session Management
- Test multiple concurrent sessions
- Verify session timeout behavior
- Test logout functionality
- Check "Remember Me" functionality
- Validate session hijacking detection

**MCP Servers:** Playwright, Accessibility Scanner, Chrome DevTools

**Success Criteria:**
- ✅ All auth flows work as documented
- ✅ Security measures are active
- ✅ Error messages are clear and accessible
- ✅ Forms are keyboard navigable
- ✅ Rate limiting prevents brute force

---

### Phase 3: Core Feature Testing ⏱️ 90 min

#### 3.1 Gap Analysis Search
**Reference:** USER_GUIDE.md - "Running Gap Analysis Searches"

**Test Scenarios:**

1. **New Search Creation**
   - Click "New Search" button
   - Test keyboard shortcut (Ctrl/Cmd + N)
   - Enter test query: "Gaps in sustainable packaging for e-commerce"
   - Verify search submission
   - Monitor progress indicators (4 phases):
     - Market Research (30-45s)
     - Gap Identification (45-60s)
     - Feasibility Assessment (30-45s)
     - Report Generation (15-30s)
   - Validate total completion time (2-3 minutes)

2. **Search Results Display**
   - Verify Executive Summary appears
   - Check Innovation Score (0-100 scale)
   - Validate Feasibility Ratings:
     - 🟢 High (70-100)
     - 🟡 Medium (40-69)
     - 🔴 Low (0-39)
   - Confirm 4-Phase Roadmap display
   - Test progressive disclosure (expand/collapse)
   - Verify tabbed content navigation

3. **Search History**
   - Verify search appears in dashboard
   - Test "Recent Searches" section (last 10)
   - Check search filtering options
   - Test search sorting (date, score, tags)

4. **Favorites System**
   - Star a search result
   - Verify it appears in Favorites
   - Test unfavorite functionality
   - Check favorites persistence

**MCP Servers:** Playwright, Chrome DevTools

#### 3.2 Interactive AI Conversations
**Reference:** USER_GUIDE.md - "Interactive AI Conversations"

**Test Scenarios:**

1. **Starting Conversation**
   - Click "Ask AI" from search result
   - Verify conversation interface loads
   - Check suggested questions display
   - Test conversation UI responsiveness

2. **Message Exchange**
   - Send clarification question: "Can you explain the first gap in more detail?"
   - Verify AI response appears
   - Test message variants feature
   - Check context awareness
   - Test follow-up questions

3. **Conversation Limits**
   - Verify Free tier: 10 messages/conversation limit
   - Test conversation export (PDF/text)
   - Validate conversation history
   - Check conversation clearing

4. **Suggested Questions**
   - Verify suggested questions appear
   - Click a suggestion
   - Confirm it sends as message
   - Check suggestions adapt to context

**MCP Servers:** Playwright, Accessibility Scanner

#### 3.3 Action Plans & Progress Tracking
**Reference:** USER_GUIDE.md - "Action Plans & Progress Tracking"

**Test Scenarios:**

1. **Phase Navigation**
   - View 4-phase roadmap:
     - Phase 1: Research & Validation (Months 1-3)
     - Phase 2: MVP Development (Months 4-6)
     - Phase 3: Market Testing (Months 7-9)
     - Phase 4: Scale & Growth (Months 10-12)
   - Test phase expansion/collapse
   - Verify phase descriptions
   - Check task lists within phases

2. **Progress Tracking**
   - Check task completion boxes
   - Verify progress bar updates
   - Test undo functionality
   - Validate progress percentage calculation

3. **Phase Completion**
   - Complete all tasks in Phase 1
   - Verify celebration animation (confetti)
   - Check congratulatory message
   - Confirm next phase unlocks

4. **Progress Sync**
   - Make changes in one browser
   - Open in another browser/device
   - Verify progress syncs

**MCP Servers:** Playwright, Accessibility Scanner

#### 3.4 Resource Library
**Reference:** USER_GUIDE.md - "Resource Library"

**Test Scenarios:**

1. **Browsing Resources**
   - Navigate to Resource Library
   - Test category filtering:
     - 📊 Business Planning
     - 📈 Market Research
     - 💰 Funding
     - 🚀 Product Development
     - 📱 Marketing
     - 📚 Learning
   - Verify resource type filters
   - Check search functionality

2. **Resource Interaction**
   - Click resource card
   - View resource details
   - Test bookmark functionality
   - Verify rating system (1-5 stars)
   - Check usage tracking
   - Test resource preview

3. **Resource Contribution**
   - Click "Contribute Resource"
   - Fill submission form
   - Test file upload (if applicable)
   - Verify submission process
   - Check review workflow notification

4. **Resource Search**
   - Use search bar
   - Test keyword search
   - Verify results update as typing
   - Check search result relevance

**MCP Servers:** Playwright, Accessibility Scanner

#### 3.5 Project Management
**Reference:** USER_GUIDE.md - "Managing Your Projects"

**Test Scenarios:**

1. **Project Creation**
   - Navigate to Projects section
   - Click "New Project"
   - Enter project name and description
   - Set goals and milestones
   - Verify project creation

2. **Search Organization**
   - Add searches to projects
   - Test drag-and-drop functionality
   - Verify project dashboard
   - Check search grouping

3. **Project Limits**
   - Verify Free tier: 3 projects max
   - Test project deletion
   - Check project editing
   - Validate project archiving

**MCP Servers:** Playwright

---

### Phase 4: Sharing & Export Features ⏱️ 60 min

#### 4.1 Sharing Functionality
**Reference:** USER_GUIDE.md - "Sharing & Collaboration"

**Test Scenarios:**

1. **Generate Share Link**
   - Open any search result
   - Click "Share" button
   - Configure sharing options:
     - Set expiration date
     - Enable password protection
     - Allow comments option
   - Copy share link
   - Verify link format

2. **Share Link Access**
   - Open link in incognito/private window
   - Verify read-only access
   - Test without account requirement
   - Check view tracking
   - Test password-protected link

3. **Link Management**
   - Navigate to Settings > Shared Links
   - View all shared links
   - Test link revocation
   - Verify access analytics (Pro tier)
   - Check view count and timestamps

**MCP Servers:** Playwright, Fetch

#### 4.2 Export Features (Pro Tier)
**Reference:** USER_GUIDE.md - "Exploring Search Results"

**Test Scenarios:**

1. **PDF Export**
   - Click Export > PDF
   - Test Executive format
   - Test Pitch format
   - Test Detailed format
   - Verify PDF generation
   - Check PDF content completeness

2. **CSV Export**
   - Click Export > CSV
   - Verify data export
   - Check data completeness
   - Validate CSV formatting
   - Test data integrity

3. **Pitch Deck Export**
   - Click Export > Pitch Deck
   - Generate PowerPoint deck
   - Verify slide content
   - Check formatting and branding
   - Test deck completeness

**MCP Servers:** Playwright

---

### Phase 5: Navigation & UX Testing ⏱️ 60 min

#### 5.1 Dashboard Experience
**Reference:** USER_GUIDE.md - "Understanding Your Dashboard"

**Test Scenarios:**

1. **Dashboard Sections**
   - Verify Search Overview display
   - Check Recent Searches (last 10)
   - Test Favorites section
   - Validate Projects display
   - Check Recommended Resources
   - Test search statistics

2. **Quick Actions**
   - Test global search (Ctrl/Cmd + K)
   - Verify new search shortcut (Ctrl/Cmd + N)
   - Check help shortcuts (Ctrl/Cmd + /)
   - Test navigation shortcuts (Ctrl/Cmd + 1-4)

3. **Dashboard Filters**
   - Filter by date range
   - Filter by project
   - Filter by tags
   - Sort by relevance/date/score

**MCP Servers:** Playwright, Accessibility Scanner

#### 5.2 Keyboard Navigation
**Reference:** USER_GUIDE.md - "Keyboard Shortcuts"

**Test All Shortcuts:**

**Global:**
- `Ctrl/Cmd + K` - Global search
- `Ctrl/Cmd + N` - New gap analysis
- `Ctrl/Cmd + /` - Show shortcuts
- `Esc` - Close dialogs/modals

**Navigation:**
- `Ctrl/Cmd + 1` - Dashboard
- `Ctrl/Cmd + 2` - Resources
- `Ctrl/Cmd + 3` - Projects
- `Ctrl/Cmd + 4` - Settings

**Search Results:**
- `E` - Expand all sections
- `C` - Collapse all sections
- `F` - Toggle favorite
- `S` - Share result

**Conversations:**
- `Ctrl/Cmd + Enter` - Send message
- `↑` - Edit last message
- `Ctrl/Cmd + Shift + C` - Clear conversation

**MCP Servers:** Playwright, Accessibility Scanner

#### 5.3 Mobile Responsiveness
**Reference:** USER_GUIDE.md - "Mobile Experience"

**Test Scenarios:**

1. **Mobile Navigation**
   - Test hamburger menu (☰)
   - Verify menu opens/closes
   - Check touch targets (44x44px minimum)
   - Test swipe gestures

2. **Mobile Layouts**
   - Test on iPhone viewport (375x667)
   - Test on Android viewport (360x640)
   - Test on tablet (768x1024)
   - Verify responsive breakpoints

3. **Mobile Features**
   - Pull-to-refresh functionality
   - Swipe between tabs
   - Touch-optimized forms
   - Mobile keyboard handling

4. **Mobile Performance**
   - Check load times on mobile
   - Test touch responsiveness
   - Verify scroll performance
   - Check image optimization

**MCP Servers:** Playwright, Chrome DevTools

---

### Phase 6: Accessibility Compliance ⏱️ 60 min

**Reference:** USER_GUIDE.md - "Accessibility" section  
**Standard:** WCAG 2.1 Level AA

#### 6.1 Automated Accessibility Audit

**Test Areas:**

1. **Perceivable**
   - Text alternatives for images (alt text)
   - Color contrast ratios (4.5:1 minimum for normal text)
   - Adaptable content structure
   - Distinguishable content (color not sole indicator)

2. **Operable**
   - Keyboard accessibility (all functions)
   - Sufficient time for interactions
   - Seizure prevention (no flashing >3 times/second)
   - Navigable structure (skip links, headings)

3. **Understandable**
   - Readable text (language attribute)
   - Predictable behavior
   - Input assistance (labels, error messages)
   - Error identification and suggestions

4. **Robust**
   - Compatible with assistive technologies
   - Valid HTML/ARIA
   - Proper semantic markup
   - ARIA attributes used correctly

**MCP Servers:** Accessibility Scanner

#### 6.2 Manual Accessibility Testing

**Test Scenarios:**

1. **Keyboard Navigation**
   - Tab through entire app
   - Verify visible focus indicators
   - Test skip links
   - Check modal focus trapping
   - Verify logical tab order

2. **Screen Reader Testing**
   - Test with screen reader simulation
   - Verify ARIA labels
   - Check heading hierarchy (h1-h6)
   - Validate form labels
   - Test landmark regions

3. **Accessibility Features**
   - Enable High Contrast Mode
   - Test Reduced Motion option
   - Check text resizing (up to 200%)
   - Verify Screen Reader Optimized Mode

4. **Form Accessibility**
   - Check label associations
   - Test error announcements
   - Verify required field indicators
   - Check form validation messages

**MCP Servers:** Accessibility Scanner, Playwright

---

### Phase 7: Visual & Theme Testing ⏱️ 45 min

#### 7.1 Neon Flame Theme Validation
**Reference:** product.md - "Design Theme"

**Visual Elements to Verify:**

1. **Color Palette**
   - Purple flame colors present
   - Red flame colors present
   - Orange flame colors present
   - White flame accents
   - Ultra-dark gradients
   - Proper contrast ratios maintained

2. **Branding**
   - Custom SVG logo displays correctly
   - Transparent flame-themed elements
   - Consistent brand presence across pages
   - Logo visibility on dark backgrounds

3. **Dark Mode**
   - Dark-first design implementation
   - Mysterious "black hole" aesthetic
   - Proper color transitions
   - No white flashes on page load

4. **Visual Consistency**
   - Consistent spacing and padding
   - Uniform button styles
   - Consistent typography
   - Proper icon usage

**MCP Servers:** Playwright (screenshots), Chrome DevTools

#### 7.2 Responsive Design

**Breakpoints to Test:**

**Mobile:**
- 320px (iPhone SE)
- 375px (iPhone 12/13)
- 414px (iPhone 12 Pro Max)

**Tablet:**
- 768px (iPad)
- 1024px (iPad Pro)

**Desktop:**
- 1280px (Laptop)
- 1440px (Desktop)
- 1920px (Full HD)

**Test Each Breakpoint:**
- Layout adapts correctly
- No horizontal scrolling
- Touch targets appropriate size
- Text remains readable
- Images scale properly

**MCP Servers:** Playwright, Chrome DevTools

---

### Phase 8: Performance Testing ⏱️ 45 min

**Reference:** README.md - "Performance & Scalability"

#### 8.1 Load Time Validation

**Requirements:**
- Page load: <3 seconds
- API response: <500ms
- Search completion: 2-3 minutes

**Test Scenarios:**

1. **Initial Page Load**
   - Measure Time to Interactive (TTI)
   - Check First Contentful Paint (FCP)
   - Verify Largest Contentful Paint (LCP)
   - Test Cumulative Layout Shift (CLS)
   - Measure First Input Delay (FID)

2. **API Performance**
   - Test authentication endpoints (<500ms)
   - Measure search API response
   - Check resource loading times
   - Validate pagination performance

3. **Caching Effectiveness**
   - Verify Redis cache hits
   - Test static asset caching
   - Check query result caching
   - Measure cache hit ratio

**MCP Servers:** Chrome DevTools (Performance Trace)

#### 8.2 Performance Profiling

**Areas to Profile:**

1. **JavaScript Execution**
   - Identify long-running scripts
   - Check for memory leaks
   - Measure bundle size
   - Analyze code splitting

2. **Network Waterfall**
   - Analyze request sequence
   - Check for blocking resources
   - Verify parallel loading
   - Test CDN effectiveness

3. **Memory Usage**
   - Monitor memory consumption
   - Check for memory leaks
   - Test garbage collection
   - Verify cleanup on navigation

4. **Core Web Vitals**
   - LCP: <2.5s (good)
   - FID: <100ms (good)
   - CLS: <0.1 (good)

**MCP Servers:** Chrome DevTools

---

### Phase 9: Security Feature Validation ⏱️ 60 min

**Reference:** SECURITY.md, docs/SECURITY.md

#### 9.1 Security Headers

**Verify Headers Present:**
- `Content-Security-Policy` (CSP)
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

**Test Method:**
- Use Chrome DevTools Network tab
- Inspect response headers
- Verify all security headers present
- Check CSP directives

**MCP Servers:** Chrome DevTools

#### 9.2 Rate Limiting

**Test Scenarios:**

1. **Login Rate Limiting**
   - Attempt 5 failed logins
   - Verify account lockout
   - Check CAPTCHA appears
   - Test lockout duration

2. **API Rate Limiting**
   - Make rapid API requests
   - Verify rate limit response (429)
   - Check rate limit headers
   - Test rate limit reset

3. **Search Rate Limiting**
   - Test Free tier: 5 searches/month
   - Verify limit enforcement
   - Check limit reset date
   - Test upgrade prompt

**MCP Servers:** Playwright, Chrome DevTools

#### 9.3 Input Validation

**Test Cases:**

1. **SQL Injection Attempts**
   - Test with SQL payloads in forms
   - Verify parameterized queries
   - Check error handling
   - Confirm no data leakage

2. **XSS Payload Testing**
   - Test with script tags
   - Try event handlers
   - Test HTML injection
   - Verify sanitization

3. **CSRF Token Validation**
   - Check CSRF tokens present
   - Test token validation
   - Verify token rotation
   - Test cross-origin requests

4. **Zod Schema Validation**
   - Test with invalid data types
   - Check boundary conditions
   - Verify error messages
   - Test required field validation

**MCP Servers:** Playwright, VibeCheck

---

### Phase 10: Documentation Accuracy ⏱️ 45 min

#### 10.1 User Guide Validation
**Reference:** docs/USER_GUIDE.md

**Cross-Reference Checklist:**

1. **Feature Existence**
   - All features mentioned exist
   - Feature descriptions are accurate
   - Screenshots match current UI
   - Instructions are correct

2. **Keyboard Shortcuts**
   - All shortcuts listed work
   - Shortcuts match documentation
   - No undocumented shortcuts
   - Shortcut conflicts resolved

3. **Feature Availability**
   - Free tier limits accurate
   - Pro tier features correct
   - Enterprise features documented
   - Upgrade paths clear

4. **Navigation Paths**
   - All menu paths correct
   - Page locations accurate
   - Links work properly
   - Breadcrumbs match structure

**MCP Servers:** Playwright, Fetch, VibeCheck

#### 10.2 FAQ Accuracy
**Reference:** docs/FAQ.md

**Verify:**

1. **Answer Accuracy**
   - All FAQ answers correct
   - Information up-to-date
   - No contradictions
   - Clear and helpful

2. **Link Validation**
   - All internal links work
   - External links valid
   - Email addresses correct
   - Support channels active

3. **Pricing Information**
   - Tier pricing accurate
   - Feature lists correct
   - Discount information current
   - Payment methods listed

4. **Contact Information**
   - Support email valid
   - Response times accurate
   - Social media links work
   - Community links active

**MCP Servers:** Fetch, Playwright

---

## 📊 Test Execution Strategy

### Execution Order:

1. **Phase 1** - Environment Setup (prerequisite for all)
2. **Phase 2** - Authentication (blocks user-specific tests)
3. **Phases 3-9** - Can run in parallel after Phase 2
4. **Phase 10** - Documentation (final validation)

### Parallel Execution Groups:

**Group A (User Features):**
- Phase 3: Core Features
- Phase 4: Sharing & Export
- Phase 5: Navigation & UX

**Group B (Technical):**
- Phase 6: Accessibility
- Phase 7: Visual Testing
- Phase 8: Performance

**Group C (Security):**
- Phase 9: Security Validation

---

## 📝 Test Reporting Template

### Test Execution Report

**Phase:** [Phase Name]  
**Date:** [Date]  
**Duration:** [Time]  
**Tester:** [Name/AI]

#### Summary
- Total Test Cases: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]
- Pass Rate: [Percentage]

#### Failed Tests
| Test Case | Expected | Actual | Severity | Screenshot |
|-----------|----------|--------|----------|------------|
| [Name] | [Expected behavior] | [Actual behavior] | [Critical/High/Medium/Low] | [Link] |

#### Performance Metrics
- Page Load Time: [Time]
- API Response Time: [Time]
- Lighthouse Score: [Score]
- Accessibility Score: [Score]

#### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

---

## ✅ Success Criteria

### Must Pass (Critical):
- ✅ All authentication flows work
- ✅ Core search functionality operates correctly
- ✅ No critical accessibility violations (Level A)
- ✅ Page load times meet requirements (<3s)
- ✅ All documented features exist and work
- ✅ Security features are active
- ✅ Mobile responsiveness works

### Should Pass (Important):
- ✅ All keyboard shortcuts function
- ✅ Export features work (Pro tier)
- ✅ Sharing functionality operates
- ✅ Progress tracking syncs
- ✅ Resource library is functional
- ✅ No console errors
- ✅ WCAG 2.1 AA compliance

### Nice to Have (Optional):
- ✅ Perfect accessibility score (Level AAA)
- ✅ Lighthouse score >90
- ✅ All documentation 100% accurate
- ✅ Visual regression tests pass
- ✅ Zero performance bottlenecks

---

## 🚀 Ready to Execute

**All MCP servers configured and auto-approved:**
- Chrome DevTools ✅
- Playwright ✅
- Accessibility Scanner ✅
- Browserbase ✅
- Fetch ✅
- Context7 ✅
- VibeCheck ✅

**Next Steps:**
1. Begin Phase 1: Environment Setup
2. Execute phases sequentially or in parallel
3. Document findings in real-time
4. Generate comprehensive test report
5. Create bug reports for failures
6. Provide recommendations

**Estimated Total Time:** 8-10 hours for complete testing

---

*Testing Plan Created: October 29, 2025*  
*Target Application: Unbuilt - https://unbuilt.one*  
*Documentation References: USER_GUIDE.md, FAQ.md, SECURITY.md, README.md*
