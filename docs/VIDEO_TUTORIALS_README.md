# Video Tutorials

This document tracks the status of video tutorials for Unbuilt's UX features.

## Tutorial Status

| # | Title | Duration | Status | YouTube URL | Last Updated |
|---|-------|----------|--------|-------------|--------------|
| 1 | Welcome to Unbuilt - Onboarding Walkthrough | 3-4 min | 📝 Script Ready | TBD | 2025-01-27 |
| 2 | Dashboard & Organization Features | 4-5 min | 📝 Script Ready | TBD | 2025-01-27 |
| 3 | Action Plans & Progress Tracking | 3-4 min | 📝 Script Ready | TBD | 2025-01-27 |
| 4 | Sharing & Collaboration | 2-3 min | 📝 Script Ready | TBD | 2025-01-27 |
| 5 | Keyboard Shortcuts & Power User Tips | 3-4 min | 📝 Script Ready | TBD | 2025-01-27 |
| 6 | Accessibility Features | 2-3 min | 📝 Script Ready | TBD | 2025-01-27 |

**Status Legend**:
- 📝 Script Ready - Script written, ready for recording
- 🎬 Recording - Currently being recorded
- ✂️ Editing - In post-production
- ✅ Published - Live and available
- 🔄 Needs Update - Requires re-recording

## Production Timeline

### Phase 1: Recording (Week 1)
- [ ] Set up recording environment
- [ ] Record Tutorial 1: Onboarding
- [ ] Record Tutorial 2: Dashboard
- [ ] Record Tutorial 3: Action Plans

### Phase 2: Recording (Week 2)
- [ ] Record Tutorial 4: Sharing
- [ ] Record Tutorial 5: Keyboard Shortcuts
- [ ] Record Tutorial 6: Accessibility

### Phase 3: Post-Production (Week 3)
- [ ] Edit all videos
- [ ] Add intro/outro animations
- [ ] Create closed captions
- [ ] Generate thumbnails
- [ ] Compress and optimize

### Phase 4: Publishing (Week 4)
- [ ] Upload to YouTube
- [ ] Add to help system database
- [ ] Test embedded playback
- [ ] Update documentation links
- [ ] Announce to users

## Integration Points

### Help System Database

Videos are stored in the `help_articles` table with `videoUrl` field:

```sql
INSERT INTO help_articles (title, content, context, category, video_url) VALUES
('Welcome to Unbuilt', '...', ARRAY['onboarding'], 'getting-started', 'https://youtube.com/watch?v=...'),
('Dashboard Features', '...', ARRAY['dashboard'], 'features', 'https://youtube.com/watch?v=...');
```

### Contextual Help Panel

Videos appear in the help panel based on context:

```typescript
// Example: Dashboard context shows dashboard tutorial
<ContextualHelpPanel context="dashboard" />
// Displays: "Dashboard & Organization Features" video
```

### Onboarding Integration

Tutorial 1 is embedded in the onboarding wizard:

```typescript
<OnboardingWizard>
  <VideoStep videoUrl="https://youtube.com/watch?v=..." />
</OnboardingWizard>
```

### Help Menu

All tutorials accessible from Help > Video Tutorials:

```typescript
<HelpMenu>
  <VideoTutorialsSection videos={allTutorials} />
</HelpMenu>
```

## Video Specifications

### Technical Requirements
- **Resolution**: 1920x1080 (1080p)
- **Frame Rate**: 30fps
- **Format**: MP4 (H.264)
- **Audio**: 128kbps AAC
- **Max File Size**: 50MB per video
- **Captions**: SRT format, included

### Branding Guidelines
- Unbuilt logo in bottom-right corner
- Brand colors: Purple (#8B5CF6), Red (#EF4444), Orange (#F97316)
- Intro: 3 seconds with logo animation
- Outro: 5 seconds with CTA and website

### Accessibility Requirements
- Closed captions (English)
- Audio descriptions for visual elements
- High contrast visuals
- Clear, slow cursor movements
- Keyboard shortcuts shown on screen

## YouTube Channel Setup

### Channel Information
- **Name**: Unbuilt
- **Handle**: @UnbuiltApp
- **Description**: Discover what doesn't exist yet. AI-powered innovation gap analysis.
- **Banner**: 2560x1440px with brand colors
- **Profile**: Unbuilt logo

### Playlists
1. **Getting Started** - Tutorials 1-2
2. **Advanced Features** - Tutorials 3-5
3. **Accessibility** - Tutorial 6
4. **Tips & Tricks** - Future content

### Video Settings
- **Visibility**: Public
- **Category**: Education
- **Tags**: innovation, gap analysis, AI, market research, entrepreneurship
- **Comments**: Enabled with moderation
- **Embedding**: Allowed
- **Age Restriction**: None

## Analytics & Metrics

Track these metrics for each video:

- **Views**: Total view count
- **Watch Time**: Average watch duration
- **Engagement**: Likes, comments, shares
- **Completion Rate**: % who watch to end
- **Click-Through Rate**: From help system
- **Feedback**: Helpful/Not Helpful ratings

### Success Criteria
- 80%+ completion rate
- 90%+ helpful ratings
- <5% bounce rate from help system
- Positive user feedback

## Maintenance Plan

### Quarterly Review (Every 3 months)
- Review analytics for each video
- Check for outdated content
- Gather user feedback
- Plan updates if needed

### Update Triggers
- Major UI changes
- New features added
- User confusion reported
- Low completion rates

### Re-recording Process
1. Update script in VIDEO_TUTORIAL_SCRIPTS.md
2. Schedule recording session
3. Record and edit new version
4. Replace YouTube video (or upload new)
5. Update help system database
6. Notify users of improvements

## User Feedback

Collect feedback through:
1. **In-Video**: YouTube comments
2. **Help System**: "Was this helpful?" buttons
3. **Support**: Email feedback
4. **Analytics**: Watch time and completion rates

### Common Feedback Themes
- Video too long/short
- Missing information
- Unclear explanations
- Audio quality issues
- Outdated content

## Future Video Ideas

Based on user requests and feature additions:

- [ ] Advanced Search Techniques
- [ ] Exporting and Reporting
- [ ] Team Collaboration (Enterprise)
- [ ] API Integration Guide
- [ ] Mobile App Tutorial
- [ ] Customization Options
- [ ] Troubleshooting Common Issues
- [ ] Best Practices for Gap Analysis

## Resources

### Production Tools
- **Screen Recording**: OBS Studio (free) or Camtasia (paid)
- **Video Editing**: DaVinci Resolve (free) or Adobe Premiere (paid)
- **Audio Recording**: Audacity (free) or Adobe Audition (paid)
- **Captions**: YouTube auto-captions + manual review
- **Thumbnails**: Figma or Canva

### External Links
- [VIDEO_TUTORIAL_SCRIPTS.md](./VIDEO_TUTORIAL_SCRIPTS.md) - Full scripts
- [YouTube Channel](https://youtube.com/@UnbuiltApp) - TBD
- [Help System](https://unbuilt.one/help) - Live help articles

## Contact

**Video Production Team**: video@unbuilt.one

**Questions or Suggestions**: support@unbuilt.one

---

**Last Updated**: January 27, 2025
**Next Review**: April 27, 2025
