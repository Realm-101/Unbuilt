import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { CollaborationServer } from "./websocket";
import { tokenCleanupService } from "./services/tokenCleanup";
import { envValidator } from "./config/envValidator";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Set up WebSocket server for collaboration
  const collaborationServer = new CollaborationServer(server);
  log("WebSocket server initialized for real-time collaboration");

  // Start JWT token cleanup service
  tokenCleanupService.start();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
