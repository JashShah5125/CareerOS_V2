import express from 'express';
import cors from 'cors';
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

// Default root response for checks
app.get('/', (req, res) => {
  res.json({
    app: 'AI Career Copilot API',
    status: 'online',
    version: '1.0.0'
  });
});

// Generic Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;
