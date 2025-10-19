# Export and Navigation Fixes

## Issues Fixed

### 1. ✅ Dropdown Closing on Checkbox Click
**Problem:** When clicking checkboxes to select/deselect pages for export, the dropdown menu would close immediately, making it impossible to select multiple pages.

**Root Cause:** The default behavior of `DropdownMenuCheckboxItem` was to close the dropdown on any interaction.

**Solution:**
Added `onSelect={(e) => e.preventDefault()}` to each checkbox item to prevent the dropdown from closing when toggling checkboxes.

```tsx
<DropdownMenuCheckboxItem
  key={page.id}
  checked={selectedPages.includes(page.id)}
  onCheckedChange={() => togglePageSelection(page.id)}
  onSelect={(e) => e.preventDefault()}  // ← Prevents dropdown close
>
  {page.name}
</DropdownMenuCheckboxItem>
```

**Result:** Users can now freely check/uncheck multiple pages without the dropdown closing. The dropdown only closes when clicking a format option to export.

---

### 2. ✅ Export Not Using Selected Pages
**Problem:** The export was generating the same generic PDF regardless of which pages were selected. It was exporting a list of all market gaps instead of the detailed analysis of the single opportunity with only the selected pages.

**Root Cause:** The backend `exportPdf` function wasn't checking for page-specific exports and always used the generic multi-result PDF generator.

**Solution:**
Created a new `generatePageSpecificHTML` function that:
- Detects single-result exports with page selection
- Generates custom HTML for each selected page:
  - **Analysis**: Full opportunity overview, scores, recommendations
  - **Roadmap**: 4-phase development plan with actionable steps
  - **Research**: Market research strategies and validation methods
  - **Resources**: Curated list of startup resources with descriptions
  - **Funding**: Funding options with timeline and investment estimates
- Uses professional styling with gradient headers and color-coded sections
- Includes all relevant metrics and data from the opportunity

**Technical Implementation:**
```typescript
async function exportPdf(results: any[], res: Response, format: string, options: any) {
  const selectedPages = options.pages || [];
  const isSingleResult = results.length === 1;
  
  let html: string;
  
  if (isSingleResult && selectedPages.length > 0) {
    // Generate page-specific HTML for single result
    html = generatePageSpecificHTML(results[0], selectedPages, options);
  } else {
    // Use existing PDF generator for multi-result exports
    html = pdfGenerator.generateHTML(results, pdfOptions);
  }
  // ... rest of PDF generation
}
```

**Result:** 
- Exports now contain only the selected pages
- Each page has detailed, formatted content specific to that section
- Professional PDF layout with proper styling and structure
- Metrics, recommendations, and roadmaps are properly formatted

---

### 3. ✅ Market Research Auto-Population
**Problem:** Clicking "Start Market Research" from the Research tab would navigate to the market research page, but the form would be empty. Users had to manually re-enter the opportunity details.

**Root Cause:** No data was being passed between the action plan modal and the market research page.

**Solution:**
Implemented a context-passing mechanism using `sessionStorage`:

**In Action Plan Modal:**
```typescript
const handleMarketResearch = () => {
  // Store the opportunity data in sessionStorage
  sessionStorage.setItem('marketResearchContext', JSON.stringify({
    title: result.title,
    description: result.description,
    category: result.category,
    marketSize: result.marketSize,
    industryContext: result.industryContext
  }));
  onClose();
  setLocation('/market-research');
};
```

**In Market Research Page:**
```typescript
React.useEffect(() => {
  const contextData = sessionStorage.getItem('marketResearchContext');
  if (contextData) {
    try {
      const context = JSON.parse(contextData);
      setSearchQuery(context.title || context.description);
      
      // Map category to industry
      const categoryToIndustry: Record<string, string> = {
        'technology': 'tech',
        'market': 'tech',
        'ux': 'tech',
        'business_model': 'b2b'
      };
      setIndustry(categoryToIndustry[context.category] || 'tech');
      
      // Clear context after using it
      sessionStorage.removeItem('marketResearchContext');
    } catch (e) {
      console.error('Failed to parse market research context:', e);
    }
  }
}, []);
```

**Result:**
- Market research form is automatically populated with opportunity title/description
- Industry is intelligently selected based on the opportunity category
- Seamless workflow: View opportunity → Click research → Form pre-filled → Start research
- Context is cleared after use to prevent stale data

---

## User Experience Improvements

### Before
1. **Export Dropdown**: Click checkbox → Dropdown closes → Frustration
2. **Export Content**: Get generic multi-gap PDF regardless of selection
3. **Market Research**: Navigate → Empty form → Re-type everything

### After
1. **Export Dropdown**: Select multiple pages freely → Choose format → Export
2. **Export Content**: Get detailed, page-specific PDF with selected sections only
3. **Market Research**: Navigate → Form pre-filled → One click to research

---

## Technical Details

### Files Modified
1. **client/src/components/action-plan-modal.tsx**
   - Added `onSelect` prevention to checkboxes
   - Implemented sessionStorage context passing
   - Enhanced market research navigation

2. **client/src/pages/market-research.tsx**
   - Added useEffect to read context from sessionStorage
   - Implemented category-to-industry mapping
   - Auto-population of search query and industry

3. **server/routes/export.ts**
   - Added `generatePageSpecificHTML` function (300+ lines)
   - Implemented page detection logic
   - Created professional HTML templates for each page type
   - Added conditional rendering based on selected pages

### Export Page Templates

Each page template includes:
- **Professional styling** with gradients and color coding
- **Responsive layout** optimized for A4 PDF
- **Metric cards** for key data points
- **Info boxes** for important context
- **Proper typography** and spacing
- **Company branding** support

### Data Flow

```
Action Plan Modal
    ↓
Select Pages (checkboxes stay open)
    ↓
Choose Format (PDF/Excel/PowerPoint/JSON)
    ↓
Backend receives: { results: [opportunity], options: { pages: ['analysis', 'roadmap'] } }
    ↓
generatePageSpecificHTML creates custom HTML
    ↓
Puppeteer converts to PDF
    ↓
User downloads formatted report
```

### Market Research Flow

```
Action Plan Modal (Research Tab)
    ↓
Click "Start Market Research"
    ↓
Store context in sessionStorage
    ↓
Navigate to /market-research
    ↓
useEffect reads context
    ↓
Form auto-populated
    ↓
Context cleared
    ↓
User clicks "Conduct Research"
```

---

## Testing Checklist

- [x] Checkboxes can be toggled without closing dropdown
- [x] Multiple pages can be selected
- [x] Export generates page-specific content
- [x] PDF includes only selected pages
- [x] Market research form auto-populates
- [x] Industry is correctly mapped from category
- [x] Context is cleared after use
- [x] Build succeeds without errors
- [x] All export formats work (PDF, Excel, JSON, PowerPoint)

---

## Future Enhancements

1. **Export Customization**
   - Add page order selection
   - Include/exclude specific sections within pages
   - Custom cover page with logo upload

2. **Market Research Integration**
   - Pre-fill additional fields (market size, competitors)
   - Suggest research queries based on opportunity
   - Link back to original opportunity from results

3. **Export Templates**
   - Multiple PDF themes (professional, modern, minimal)
   - Custom color schemes
   - Branded headers/footers

4. **Batch Operations**
   - Export multiple opportunities at once
   - Compare opportunities side-by-side
   - Generate portfolio reports
