import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.js';
import organizationsRoutes from './routes/organizations.js';
import mastersRoutes from './routes/masters.js';
import materialsRoutes from './routes/materials.js';
import transferRoutes from './routes/transfers.js';
import filesRoutes from './routes/files.js';
import usersRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    platform: 'Inventory & Surplus Exchange Platform'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
