import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';



const app = express();

//middleware setup
app.use(cors({ 
    origin: process.env.CORS_ORIGIN,
    credentials: true 
}));

//middleware setup kis kis type ka data aayega
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

//routes import
import userRoute from './routes/user.routes.js';


//routes declaration
app.use("/api/v1/users", userRoute);


export { app };