import express, { Application, Request, Response } from 'express';


const app: Application = express();

// Parsers
//app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Application Routes
app.get('/', (req: Request, res: Response) => {
    res.send({
        message: 'PH Health Care Server is running...',
    });
});

export default app;