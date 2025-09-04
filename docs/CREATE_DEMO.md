# Creating a Demo GIF for Unbuilt

## Option 1: Screen Recording (Recommended)

### Tools Needed
- **LICEcap** (Free, Windows/Mac) - Simple GIF creator
- **ScreenToGif** (Free, Windows) - More advanced features
- **Kap** (Free, Mac) - Modern screen recording for GIFs
- **RecordIt** (Free, Mac/Windows) - Quick online GIF creation

### Recording Process

1. **Prepare the Demo Flow**
   - Open https://89a6ca3c-71b2-4a86-94dd-a44feac472df.janeway.prod.repl.run/
   - Plan 30-45 second demonstration
   - Clear browser cache for fresh experience

2. **Demo Script** (30-45 seconds)
   ```
   1. Show landing page (3s) - Display neon flame theme
   2. Enter search query (5s) - "AI-powered health monitoring wearables"
   3. Click Search button (2s)
   4. Show loading state (3s)
   5. Display results (15s) - Scroll through gap analysis
   6. Click Action Plan (5s) - Show development roadmap
   7. Show Export options (5s) - PDF/CSV buttons
   8. End on results page (2s)
   ```

3. **Recording Settings**
   - **Resolution**: 1000x600px (fits GitHub README)
   - **Frame Rate**: 10-15 FPS (smaller file size)
   - **Duration**: 30-45 seconds maximum
   - **File Size**: Under 10MB for GitHub

4. **Save and Replace**
   ```bash
   # Replace the placeholder with your GIF
   mv your_demo.gif docs/demo.gif
   ```

## Option 2: Automated Screenshot Sequence

### Using Playwright (Node.js)

```javascript
// create-demo.js
const { chromium } = require('playwright');

async function createDemo() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1000, height: 600 });
  await page.goto('https://89a6ca3c-71b2-4a86-94dd-a44feac472df.janeway.prod.repl.run/');
  
  // Take screenshot sequence
  await page.screenshot({ path: 'demo-1-landing.png' });
  
  await page.fill('[placeholder*="Search"]', 'AI-powered health monitoring wearables');
  await page.screenshot({ path: 'demo-2-search.png' });
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'demo-3-results.png' });
  
  await browser.close();
}

createDemo();
```

Then convert screenshots to GIF using ImageMagick:
```bash
convert -delay 200 demo-*.png -loop 0 docs/demo.gif
```

## Option 3: Simple Static Images

If a GIF isn't feasible, create a collage:

```bash
# Create a simple collage with ImageMagick
convert \
  screenshot1.png screenshot2.png screenshot3.png \
  +append docs/demo-collage.png
```

## Updating README

Once you have `demo.gif`, update the README.md:

```markdown
![Unbuilt Demo](./docs/demo.gif)
```

Or for a static image:
```markdown
![Unbuilt Screenshots](./docs/demo-collage.png)
```

## Demo Content Suggestions

### Good Demo Queries
- "AI-powered health monitoring wearables"
- "Sustainable packaging for e-commerce"
- "Remote work collaboration tools"
- "Electric vehicle charging infrastructure"
- "Mental health apps for teenagers"

### Features to Highlight
1. **Search Interface** - Clean, Google-inspired design
2. **AI Processing** - Loading states and real-time analysis
3. **Results Display** - Innovation scores and market insights
4. **Action Plans** - 4-phase development roadmaps
5. **Export Features** - PDF and CSV download options
6. **Neon Theme** - Dark aesthetic with flame colors

## File Size Optimization

### For GIFs
- **Duration**: Keep under 45 seconds
- **Frame Rate**: 10-12 FPS is sufficient
- **Resolution**: 1000x600 or 800x500
- **Colors**: Reduce color palette if needed
- **Compression**: Use online tools like EZGIF

### For Static Images
- **Format**: PNG for screenshots, JPG for photos
- **Resolution**: 1200x800 maximum
- **Compression**: Use TinyPNG or similar

## GitHub Integration

1. **Upload to Repository**
   ```bash
   git add docs/demo.gif
   git commit -m "Add demo animation"
   git push
   ```

2. **Verify Display**
   - Check README.md on GitHub
   - Ensure GIF plays automatically
   - Verify file size under 10MB

## Alternative: Video Embed

If GIF is too large, consider hosting video elsewhere:

```markdown
[![Unbuilt Demo Video](./docs/demo-thumbnail.png)](https://youtu.be/your-video-id)
```