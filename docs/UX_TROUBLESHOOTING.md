# Troubleshooting Guide

This guide helps you resolve common issues with Unbuilt's UX features.

## Onboarding & Tour Issues

### Tour Not Starting

**Problem**: Interactive tour doesn't launch after registration.

**Solutions**:
1. Check if you previously dismissed the tour
2. Manually start the tour from Help menu > "Resume Tour"
3. Clear browser cache and reload
4. Check browser console for JavaScript errors

### Tour Steps Not Advancing

**Problem**: Tour gets stuck on a step.

**Solutions**:
1. Ensure you complete the required interaction (if step requires it)
2. Click "Next" button if interaction is optional
3. Press `Esc` to exit and restart tour
4. Try a different browser if issue persists

### Role Selection Not Saving

**Problem**: Selected role doesn't persist after onboarding.

**Solutions**:
1. Check browser's local storage is enabled
2. Ensure you're logged in (not in guest mode)
3. Complete the full onboarding flow (don't skip)
4. Check network tab for failed API calls to `/api/user/preferences`

## Dashboard Issues

### Recent Searches Not Displaying

**Problem**: Dashboard shows empty state despite having searches.

**Solutions**:
1. Refresh the page (Ctrl/Cmd + R)
2. Check if searches are filtered out by active filters
3. Verify you're logged into the correct account
4. Check browser console for API errors

### Projects Not Loading

**Problem**: Projects section shows loading state indefinitely.

**Solutions**:
1. Check your internet connection
2. Verify API endpoint `/api/projects` is accessible
3. Clear browser cache and reload
4. Check if you have any projects created (empty state is normal)

### Search Cards Missing Thumbnails

**Problem**: Search cards show placeholder instead of thumbnails.

**Solutions**:
1. Wait for thumbnails to load (they're lazy-loaded)
2. Check if images are blocked by browser extensions
3. Verify image URLs in network tab
4. This is expected for older searches (thumbnails added recently)

## Progressive Disclosure Issues

### Sections Not Expanding

**Problem**: Clicking expandable sections doesn't reveal content.

**Solutions**:
1. Ensure JavaScript is enabled
2. Check for browser console errors
3. Try clicking the entire header area (not just the icon)
4. Disable browser extensions that might interfere

### Expansion State Not Persisting

**Problem**: Expanded sections collapse when navigating away.

**Solutions**:
1. Verify local storage is enabled
2. Check if you're in private/incognito mode (state won't persist)
3. Ensure you're logged in (guest users have limited persistence)
4. Check browser console for storage quota errors

### Tabs Not Switching

**Problem**: Clicking tabs doesn't change content.

**Solutions**:
1. Check browser console for JavaScript errors
2. Ensure you're clicking the tab button (not the content area)
3. Try keyboard navigation (Arrow keys)
4. Refresh the page

## Action Plan Tracking Issues

### Checkboxes Not Saving

**Problem**: Checked steps revert to unchecked state.

**Solutions**:
1. Wait for the save indicator (checkmark should appear)
2. Check your internet connection
3. Verify API endpoint `/api/progress/:analysisId/steps/:stepId/complete` is working
4. Check browser console for failed requests
5. Try again after a few seconds (may be rate limited)

### Progress Percentage Incorrect

**Problem**: Completion percentage doesn't match checked steps.

**Solutions**:
1. Refresh the page to recalculate
2. Check if some steps are marked as optional (they don't count toward completion)
3. Verify all phases are loading correctly
4. Report to support if issue persists

### Celebration Animation Not Showing

**Problem**: No confetti when completing a phase.

**Solutions**:
1. Check if "Reduced Motion" is enabled in accessibility settings
2. Ensure browser supports animations
3. Verify you completed ALL steps in the phase
4. Check browser console for errors

## Navigation Issues

### Global Search Not Opening

**Problem**: Pressing Ctrl/Cmd + K doesn't open search.

**Solutions**:
1. Ensure you're not typing in an input field
2. Check if shortcut is customized in Settings
3. Try clicking the search icon in navigation
4. Verify keyboard shortcuts are enabled in Settings

### Mobile Menu Not Opening

**Problem**: Hamburger menu doesn't open on mobile.

**Solutions**:
1. Ensure you're tapping the menu icon (not nearby elements)
2. Check if JavaScript is enabled
3. Try refreshing the page
4. Check browser console for errors

### Navigation Items Missing

**Problem**: Some menu items don't appear.

**Solutions**:
1. Check your subscription tier (some features are Pro/Enterprise only)
2. Verify your user role (some items are role-specific)
3. Ensure you're logged in
4. Check if items are in a collapsed submenu

## Sharing Issues

### Share Link Not Generating

**Problem**: Clicking "Share" doesn't create a link.

**Solutions**:
1. Check your internet connection
2. Verify API endpoint `/api/share/:analysisId` is accessible
3. Check browser console for errors
4. Ensure you have permission to share (owner of analysis)

### Shared Link Not Working

**Problem**: Recipients can't access shared link.

**Solutions**:
1. Verify link hasn't expired
2. Check if link was revoked
3. Ensure recipients are using the complete URL
4. Try generating a new share link
5. Check if link is being blocked by corporate firewall

### Share Dialog Not Closing

**Problem**: Share dialog stays open after creating link.

**Solutions**:
1. Click the X button or press Esc
2. Click outside the dialog
3. Refresh the page if dialog is stuck
4. Check browser console for errors

## Keyboard Shortcuts Issues

### Shortcuts Not Working

**Problem**: Keyboard shortcuts don't trigger actions.

**Solutions**:
1. Verify shortcuts are enabled in Settings > Keyboard Shortcuts
2. Check if you're typing in an input field (shortcuts are disabled)
3. Ensure correct modifier key (Cmd on Mac, Ctrl on Windows)
4. Check for conflicts with browser shortcuts
5. Try customizing the shortcut to a different key

### Shortcut Reference Not Showing

**Problem**: Pressing ? doesn't show shortcuts modal.

**Solutions**:
1. Ensure you're not in an input field
2. Try clicking Help > Keyboard Shortcuts
3. Check browser console for errors
4. Verify modal isn't hidden behind other elements

## Accessibility Issues

### Screen Reader Not Announcing Content

**Problem**: Screen reader doesn't read UI elements.

**Solutions**:
1. Ensure screen reader is running and active
2. Check if "Screen Reader Optimized" mode is enabled in Settings
3. Verify ARIA labels are present (check with browser inspector)
4. Try a different screen reader (NVDA, JAWS, VoiceOver)
5. Report missing labels to support

### Focus Indicators Not Visible

**Problem**: Can't see which element has keyboard focus.

**Solutions**:
1. Enable "High Contrast Mode" in Settings > Accessibility
2. Check browser zoom level (focus indicators may be too thin)
3. Verify browser isn't suppressing focus outlines
4. Try a different browser

### High Contrast Mode Not Working

**Problem**: Enabling high contrast doesn't change appearance.

**Solutions**:
1. Refresh the page after enabling
2. Check if browser has its own high contrast mode enabled
3. Clear browser cache
4. Verify CSS is loading correctly

## Mobile Issues

### Touch Targets Too Small

**Problem**: Difficult to tap buttons on mobile.

**Solutions**:
1. Zoom in on the page
2. Use landscape orientation for more space
3. Enable "Touch Friendly Mode" in Settings (if available)
4. Report specific elements to support

### Swipe Gestures Not Working

**Problem**: Swiping doesn't navigate between tabs/phases.

**Solutions**:
1. Ensure you're swiping on the correct element (tab content area)
2. Try a more deliberate swipe gesture
3. Check if touch events are being captured by another element
4. Verify browser supports touch events

### Pull-to-Refresh Not Working

**Problem**: Pulling down doesn't refresh dashboard.

**Solutions**:
1. Ensure you're at the top of the page
2. Pull down with more force
3. Check if browser has native pull-to-refresh enabled
4. Try manual refresh button instead

## Performance Issues

### Slow Loading Times

**Problem**: Pages take too long to load.

**Solutions**:
1. Check your internet connection speed
2. Clear browser cache
3. Disable browser extensions
4. Try a different browser
5. Check if server is experiencing high load

### Animations Stuttering

**Problem**: Animations are choppy or laggy.

**Solutions**:
1. Enable "Reduced Motion" in Settings to disable animations
2. Close other browser tabs
3. Check CPU usage (close other applications)
4. Try a different browser
5. Update graphics drivers

### High Memory Usage

**Problem**: Browser uses excessive memory.

**Solutions**:
1. Close unused tabs
2. Clear browser cache
3. Disable browser extensions
4. Restart browser
5. Use a lighter browser (if available)

## Data Persistence Issues

### Preferences Not Saving

**Problem**: Settings revert after closing browser.

**Solutions**:
1. Ensure cookies are enabled
2. Check if you're in private/incognito mode
3. Verify local storage is enabled
4. Check browser storage quota
5. Try a different browser

### Progress Lost After Logout

**Problem**: Action plan progress disappears after logging out.

**Solutions**:
1. Ensure you're logged in (not guest mode)
2. Wait for save confirmation before logging out
3. Check if progress was saved to server (check network tab)
4. Verify API endpoint `/api/progress` is working
5. Contact support to recover data

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Known Issues
- **Internet Explorer**: Not supported (use Edge instead)
- **Safari < 14**: Some animations may not work
- **Firefox < 88**: Keyboard shortcuts may conflict

## Getting Additional Help

If you've tried these solutions and still experience issues:

1. **Check Browser Console**: Press F12 and look for error messages
2. **Check Network Tab**: Verify API calls are succeeding
3. **Try Different Browser**: Rule out browser-specific issues
4. **Clear Everything**: Cache, cookies, local storage
5. **Contact Support**: Email support@unbuilt.one with:
   - Description of the issue
   - Steps to reproduce
   - Browser and OS version
   - Screenshots or screen recording
   - Browser console errors

## Reporting Bugs

When reporting bugs, please include:

- **What happened**: Describe the issue
- **What you expected**: What should have happened
- **Steps to reproduce**: How to recreate the issue
- **Environment**: Browser, OS, device
- **Screenshots**: Visual evidence
- **Console errors**: JavaScript errors from browser console

Email: support@unbuilt.one

---

**Still need help?** Check our [FAQ](./FAQ.md) or [Getting Started Guide](./UX_GETTING_STARTED.md).
