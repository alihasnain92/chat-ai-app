// src/app.ts
import express from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import conversationRoutes from './routes/conversation.routes';
import messageRoutes from './routes/message.routes';

// ✅ Fix BigInt serialization globally
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

app.use(express.json());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api', messageRoutes); // Handles /api/conversations/:id/messages and /api/messages/:id

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("❌ Error occurred:", err);
  console.error("Stack trace:", err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

export default app;
