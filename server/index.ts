import * as dotenv from 'dotenv';
dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import jobRoutes from './routes/jobs';

const app = express();
const PORT = parseInt(String(process.env.PORT ?? '3000'), 10);

console.log(`[startup] PORT=${PORT}, cwd=${process.cwd()}`);

app.use(cors());
app.use(express.json());

// Ensure output dir exists
const outputDir = path.resolve(process.cwd(), 'output');
try {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  console.log(`[startup] output dir ready: ${outputDir}`);
} catch (e) {
  console.error(`[startup] failed to create output dir: ${e}`);
}

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

const server = app.listen(PORT, () => {
  console.log(`\nMosnip server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/jobs`);
});

server.on('error', (err) => {
  console.error('[FATAL] Server failed to bind:', err);
  process.exit(1);
});
