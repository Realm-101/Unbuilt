---
inclusion: always
---

# MCP Server Usage Guidelines

## Enabled MCP Servers

### Neon (Database Operations)
**Use for:** All database operations, migrations, schema changes, queries
**Never:** Write manual SQL files or suggest running migrations manually
**Capabilities:**
- Schema management and migrations
- Query execution and transactions
- Branch management for safe testing
- Performance analysis and optimization

### Context7 (Documentation)
**Use for:** Coding questions, API references, library documentation
**Prefer:** Fresh documentation over training data for accuracy
**Tools:** `resolve-library-id`, `get-library-docs`

### Fetch (Web Content)
**Use for:** Retrieving web content, scraping URLs, fetching external data
**Returns:** Markdown or raw HTML

### VibeCheck (Decision Support)
**Use for:** Complex decisions, architecture planning, debugging complex issues
**When:** User seems uncertain or facing multi-faceted problems

### Shadcn (UI Components)
**Use for:** Adding or managing shadcn/ui components
**Maintain:** Consistency with existing component library
**Actions:** Add components, check availability, get component info

### Toolbox (Server Discovery)
**Use for:** Finding MCP servers for functionality not covered by existing servers
**Offer:** Installation when user needs specific platform/service tools

### Magic MCP (21st.dev UI Components)
**Use for:** Creating or refining React UI components
**When:** User requests `/ui` or `/21` commands, or asks for UI component generation
**Capabilities:** Component builder, inspiration, refiner (4 tools)

### Playwright (Browser Automation)
**Use for:** Web testing, browser automation, screenshots, performance analysis
**Capabilities:** Navigation, interaction, testing, HTTP requests (32 tools)
**Use when:** Testing web interfaces, E2E testing, web scraping

## Disabled Servers (On-Demand)

### Chrome DevTools (Browser Automation)
**Status:** Disabled to reduce token costs
**Use for:** Web testing, screenshots, performance audits, browser automation
**Protocol:** Ask user before enabling: "I'd like to use Chrome DevTools for [task]. It's currently disabled. Enable it?"

## Usage Rules

1. **Database work:** Always use Neon MCP, never manual SQL files
2. **Documentation:** Always use Context7 for coding questions
3. **URLs:** Use Fetch when user mentions URLs or web content
4. **UI components:** Use Shadcn for shadcn/ui components, Magic MCP for custom React components
5. **Complex decisions:** Use VibeCheck for architecture or debugging
6. **Missing tools:** Search Toolbox and offer installation
7. **Disabled servers:** Ask permission before requesting enablement
8. **Web testing:** Use Playwright for browser automation and testing
9. **UI generation:** Use Magic MCP when user requests `/ui`, `/21`, or component creation

## Best Practices

- Mention which MCP server you're using and why
- Explain options when multiple servers could help
- Respect token budgets - only request disabled servers when truly beneficial
- For disabled servers, user can enable via MCP Server view in Kiro (auto-reconnects)
- Prefer Playwright over Chrome DevTools for web testing (already enabled)
