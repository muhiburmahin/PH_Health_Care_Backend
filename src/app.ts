import express, { Application, Request, Response } from 'express';
import { IndexRoutes } from './app/routes';
import { globalErrorHandler } from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';
import AppError from './app/middleware/appError';
import status from "http-status";
import cookieParser from 'cookie-parser';

const app: Application = express();

// Parsers
//app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Application Routes
app.get('/', (req: Request, res: Response) => {
    throw new AppError(status.BAD_REQUEST, "bad error")
    res.send({
        message: 'PH Health Care Server is running...',
    });
});

app.use("/api/v1/", IndexRoutes)
app.use(globalErrorHandler)
app.use(notFound)


export default app;