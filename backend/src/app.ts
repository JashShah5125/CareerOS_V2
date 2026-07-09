import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();

app.use(cors({
  origin: '*', // Allow all for mock development simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Load all API endpoints
app.use(routes);

// Serve React frontend static files in production
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// For any non-API route, return the React app (for client-side routing)
app.get('*', (req, res) => {
  const indexFile = path.join(publicPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      // Fallback API status if no frontend files found
      res.json({
        app: 'AI Career Copilot API',
        status: 'online',
        version: '1.0.0'
      });
    }
  });
});

// Generic Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;
