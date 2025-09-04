import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication that works perfectly on Replit
// No complex OAuth, no external dependencies, just clean and simple

export async function setupSimpleAuth(app: Express) {
  // For development: get or create demo user
  let demoUser = await storage.getUser("1");
  if (!demoUser) {
    demoUser = await storage.upsertUser({
      id: 1,
      email: "test@example.com", 
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null
    });
  }

  // Simple auth endpoint - returns demo user for now
  app.get('/api/auth/user', async (req, res) => {
    res.json(demoUser);
  });

  app.get('/api/login', (req, res) => {
    res.redirect('/');
  });

  app.get('/api/logout', (req, res) => {
    res.redirect('/');
  });
}

// For now, just allow all requests (demo mode)
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Add demo user to request
  (req as any).user = {
    claims: {
      sub: "1", // Use the demo user ID
      email: "demo@unbuilt.com",
      first_name: "Demo",
      last_name: "User"
    }
  };
  next();
};