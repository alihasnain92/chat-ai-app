// src/app.ts
import express from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes'; // ✅ add this

const app = express();

app.use(express.json());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // ✅ now all your user tests will work

export default app;
