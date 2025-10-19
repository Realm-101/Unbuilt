import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { CollaborationServer } from "./websocket";
import { tokenCleanupService } from "./services/tokenCleanup";
import { scheduledTaskService } from "./services/scheduledTasks";
import { envValidator } from "./config/envValidator";
import { securityHeadersMiddleware } from "./middleware/securityHeaders";
import { httpsEnforcementMiddleware, secureCookieMiddleware, sessionSecurityMiddleware } from "./middleware/httpsEnforcement";
import { cacheService } from "./services/cache";
import { getCorsConfig, isOriginAllowed } from "./config/cors";

const app = express();

// CORS configuration - supports multiple domains
const corsConfig = getCorsConfig();
log(`CORS: Allowed origins: ${corsConfig.allowedOrigins.join(', ')}`, 'info');

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin, corsConfig)) {
      return callback(null, true);
    }
    
    log(`CORS: Blocked origin: ${origin}`, 'warn');
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Apply security middleware early in the stack
app.use(httpsEnforcementMiddleware);
app.use(securityHeadersMiddleware);
app.use(secureCookieMiddleware);

app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: false, limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(cookieParser());
app.use(sessionSecurityMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add health check endpoint for Replit
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Debug endpoint to check cookies
app.get('/api/debug/cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });
});

(async () => {
  // Validate environment configuration on startup
  log("Validating environment configuration...");
  const requiredValidation = envValidator.validateRequired();
  const optionalValidation = envValidator.validateOptional();

  // Log validation results
  if (requiredValidation.errors.length > 0) {
    console.error("❌ Environment validation failed:");
    requiredValidation.errors.forEach(error => {
      console.error(`  - ${error.field}: ${error.message}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      console.error("Exiting due to configuration errors in production");
      process.exit(1);
    } else {
      console.warn("⚠️  Continuing with configuration errors in development mode");
    }
  }

  if (requiredValidation.warnings.length > 0 || optionalValidation.warnings.length > 0) {
    console.warn("⚠️  Environment configuration warnings:");
    [...requiredValidation.warnings, ...optionalValidation.warnings].forEach(warning => {
      console.warn(`  - ${warning.field}: ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`    Suggestion: ${warning.suggestion}`);
      }
    });
  }

  if (requiredValidation.isValid) {
    log("✅ Environment configuration validated successfully");
  }

  // Initialize Redis cache service
  log("Initializing Redis cache service...");
  await cacheService.connect();
  if (cacheService.isAvailable()) {
    log("✅ Redis cache service connected successfully");
  } else {
    log("⚠️  Redis cache service unavailable - continuing without cache");
  }

  // Add security monitoring middleware before routes
  const { addSecurityContext, logApiAccess, securityErrorHandler } = await import("./middleware/securityMonitoring");
  app.use(addSecurityContext);
  app.use(logApiAccess);

  const server = await registerRoutes(app);

  // Use security error handler before general error handling
  app.use(securityErrorHandler);

  // Use standardized error handling middleware
  const { errorHandlerMiddleware } = await import("./middleware/errorHandler");
  app.use(errorHandlerMiddleware);

  // Set up WebSocket server for collaboration
  const collaborationServer = new CollaborationServer(server);
  log("WebSocket server initialized for real-time collaboration");

  // Start JWT token cleanup service
  tokenCleanupService.start();

  // Start session management scheduled tasks
  scheduledTaskService.start();

  // Create demo user if configured
  const { demoUserService } = await import("./services/demoUser");
  await demoUserService.createDemoUserIfNeeded();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on configured port (default 5000)
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.HOST || '0.0.0.0';
  
  server.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });
})();
