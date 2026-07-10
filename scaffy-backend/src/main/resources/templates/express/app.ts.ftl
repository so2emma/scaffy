import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the ${projectName} API!" });
});

// Error handling middleware
app.use(errorHandler);

export default app;
