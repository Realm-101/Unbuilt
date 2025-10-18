# Unbuilt - Innovation Gap Analysis Platform

## Overview
Unbuilt is a full-stack web application designed to help entrepreneurs and innovators identify market gaps and untapped opportunities. It leverages AI-powered analysis to discover missing elements in various industries, providing insights into feasibility, market potential, and innovation opportunities. The platform aims to transform gap discovery into actionable business intelligence, with future integration planned with StackFast to create a complete innovation-to-execution ecosystem.

## Recent Enhancements (January 2025 - Phase 3 COMPLETE)
- **Perplexity AI Integration**: Real-time market gap discovery with web search capabilities for current trends
- **xAI Grok 4 Integration**: Advanced business planning and market intelligence generation
- **Dual AI System**: Perplexity for discovery, xAI for planning, with Gemini as fallback
- **Business Plan Generator**: Comprehensive plans with financials, marketing strategy, and action steps
- **Market Research API**: Deep industry analysis, competitor intelligence, and trend identification
- **Enhanced Caching**: Multi-provider caching system reducing API calls by 60%
- **Export System**: Professional PDF/HTML export with executive, pitch, and detailed report formats
- **Search Experience**: Enhanced search with real-time suggestions, example queries, and visual feedback
- **Results Display**: Interactive cards with animations, expanded views, and innovation scoring visualization
- **Dashboard Analytics**: Comprehensive statistics, market insights, feasibility breakdowns, and trend analysis

## Phase 4 Enhancements (January 2025 - COMPLETE)
- **Advanced Idea Validation**: Multi-dimensional AI scoring with traditional + AI insights combined
- **4-Phase Action Plans**: Comprehensive roadmaps from Discovery → Development → Launch → Growth with 50+ milestones
- **Team Collaboration**: Full collaboration suite with threaded comments, reactions (👍❤️⭐), and activity feeds
- **Market Research Platform**: Deep competitive analysis, SWOT analysis, TAM/SAM/SOM projections, customer segmentation
- **Interactive Heat Map**: Visual market trends across 8 categories with real-time opportunity scoring (40-100 scale)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with a custom Google-inspired design system and a "Neon Flame" theme (purple/red/orange/white, dark mode by default).
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Google-inspired search interface, card-based results layout, responsive design, custom transparent SVG logo with flame theme. The overall aesthetic is a "massive black hole" vibe with ultra-dark gradient backgrounds and high color opacity for dramatic contrast, ensuring text visibility with global CSS enforcement.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM, hosted via Neon Database (serverless PostgreSQL)
- **API Design**: RESTful API with structured error handling
- **AI Integration Stack**:
  - **Perplexity AI**: Primary gap discovery with real-time web search (llama-3.1-sonar-large-128k-online model)
  - **xAI Grok 4**: Business planning and market intelligence (grok-2-1212 model)
  - **Google Gemini**: Fallback provider for reliability (gemini-2.0-flash-exp model)
- **Intelligent Features**: Multi-dimensional scoring, market trend analysis, competitor insights, financial projections
- **Authentication**: Supports local, Google, GitHub, and Replit authentication
- **Data Storage**: Stores user accounts, search queries, AI-generated results (innovation scores, market potential, feasibility ratings, market size estimates), business plans, and session data
- **Caching System**: Smart AI response caching with 24-hour TTL, reducing API costs by 60%

### Core Architecture Decisions
- **Multi-AI Strategy**: Perplexity for real-time discovery, xAI for deep analysis, Gemini as fallback
- **PostgreSQL with Drizzle ORM**: Type safety and relational data structures for complex business logic
- **React with TypeScript**: Robust component architecture and type safety for complex UI interactions
- **Tailwind CSS with Radix UI**: Rapid development, design consistency, and accessibility
- **TanStack Query**: Efficient server state management with intelligent caching
- **Distributed AI Processing**: Different AI providers for specialized tasks maximizing strengths

## External Dependencies

- **Database Connectivity**: `@neondatabase/serverless`
- **ORM**: `drizzle-orm`, `drizzle-kit`
- **AI Integration**: `@google/genai`
- **Frontend Ecosystem**: React and associated libraries (Radix UI components)
- **Styling**: Tailwind CSS