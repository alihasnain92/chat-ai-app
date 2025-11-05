import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Echo endpoint
app.post("/api/echo", (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Missing or invalid 'message' field in request body",
    });
  }
  res.status(200).json({
    received: message,
    timestamp: new Date().toISOString(),
  });
});

// Mount auth routes
app.use("/api/auth", authRoutes);
console.log("🔐 Auth routes mounted at /api/auth");

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Error occurred:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// ✅ Export the app for testing
export {app};

// ✅ Only start the server if this file is run directly (not during tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth endpoints:`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
  });
}
