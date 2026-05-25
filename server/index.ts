import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import jobRoutes from './routes/jobs';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// Ensure output dir exists
const outputDir = path.resolve(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// API
app.use('/api/jobs', jobRoutes);

// Health check for Railway
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve clips
app.use('/clips', express.static(outputDir));

// Serve React frontend
const clientDist = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('Mosnip API running. Build the client with: cd client && npm run build'));
}

app.listen(PORT, () => {
  console.log(`\nMosnip server running → http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/jobs`);
  if (!fs.existsSync(clientDist)) {
    console.log(`Frontend not built. Run: cd client && npm install && npm run build`);
  }
});
