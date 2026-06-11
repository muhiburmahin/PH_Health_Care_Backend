import express, { Application, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { API_PREFIX } from './constants';
import { IndexRoutes } from './app/routes';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware';

const app: Application = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware());

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'PH Health Care Server is running...',
  });
});

app.use(API_PREFIX, IndexRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
