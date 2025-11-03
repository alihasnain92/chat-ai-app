import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Middleware to parse JSON bodies
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

  // Validate request body
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Missing or invalid 'message' field in request body",
    });
  }

  // Return the received message and timestamp
  res.status(200).json({
    received: message,
    timestamp: new Date().toISOString(),
  });
});

// Basic error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
