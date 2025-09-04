# Unbuilt Setup Guide

## Development Environment Setup

### Prerequisites

Before setting up Unbuilt, ensure you have:

- **Node.js 20+**: [Download from nodejs.org](https://nodejs.org/)
- **PostgreSQL**: Local installation or cloud database
- **Git**: For version control
- **Code Editor**: VS Code recommended with TypeScript extensions

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd unbuilt
   npm install
   ```

2. **Database Configuration**
   ```bash
   # Create PostgreSQL database
   createdb unbuilt
   
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your database URL
   DATABASE_URL=postgresql://username:password@localhost:5432/unbuilt
   ```

3. **Database Setup**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Optional: Open database studio
   npm run db:studio
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Environment Variables

#### Required
- `DATABASE_URL`: PostgreSQL connection string

#### Optional (for full functionality)
- `GEMINI_API_KEY`: Google Gemini API for AI analysis
- `SENDGRID_API_KEY`: Email service for notifications
- `STRIPE_SECRET_KEY`: Payment processing
- `STRIPE_PUBLISHABLE_KEY`: Stripe public key

### Development Workflow

1. **Start the development server**
   ```bash
   npm run dev
   ```
   - Frontend: Vite dev server with HMR
   - Backend: Express server with tsx hot reload
   - Database: Auto-reconnection on schema changes

2. **Database changes**
   ```bash
   # Modify schema in shared/schema.ts
   npm run db:push
   ```

3. **Build for production**
   ```bash
   npm run build
   npm run start
   ```

## Deployment Options

### Replit Deployment

1. **Import Repository**
   - Connect GitHub repository to Replit
   - Replit automatically detects Node.js environment

2. **Configure Environment**
   - Add environment variables in Replit Secrets
   - PostgreSQL database auto-provisioned

3. **Deploy**
   - Application automatically deploys on port 5000
   - Health check endpoint ensures proper routing

### Manual Deployment

1. **Server Requirements**
   - Node.js 20+ runtime
   - PostgreSQL database
   - Port 5000 availability

2. **Deployment Steps**
   ```bash
   # Install dependencies
   npm ci --production
   
   # Build application
   npm run build
   
   # Set production environment
   export NODE_ENV=production
   
   # Start server
   npm run start
   ```

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start npm --name "unbuilt" -- run start
   pm2 startup
   pm2 save
   ```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
```

## API Configuration

### Google Gemini Setup

1. **Get API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/)
   - Create API key for Gemini Pro

2. **Configure**
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

### Database Configuration

#### Neon Database (Recommended)
```bash
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

#### Local PostgreSQL
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/unbuilt
```

## Troubleshooting

### Common Issues

1. **Port 5000 in use**
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

2. **Database connection errors**
   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Ensure database exists

3. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear build cache: `rm -rf dist/`

4. **TypeScript errors**
   - Restart TypeScript server in VS Code
   - Check for version mismatches in dependencies

### Performance Optimization

1. **Database Indexing**
   ```sql
   CREATE INDEX idx_searches_user_id ON searches(user_id);
   CREATE INDEX idx_search_results_search_id ON search_results(search_id);
   ```

2. **Memory Management**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run start
   ```

3. **Monitoring**
   - Health check endpoint: `/health`
   - Application logs via console
   - Database performance via `npm run db:studio`

## Development Tools

- **Database Studio**: `npm run db:studio`
- **Type Checking**: `npx tsc --noEmit`
- **Linting**: Built into development server
- **Hot Reload**: Automatic on file changes