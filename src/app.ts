import 'dotenv/config';
import express from 'express';

import { connectDB } from './utils/features.js';
import userRoute from './routes/user.js';
import { errorMiddleware } from './middlewares/error.js';
import productRoute from './routes/products.js';
import orderRoute from './routes/orders.js';
import paymentRoute from './routes/payment.js';
import dashboardRoute from './routes/stats.js';
import NodeCache from 'node-cache';
import morgan from 'morgan';
import Stripe from 'stripe';
import cors from 'cors';


const Port = process.env.PORT || 4000;
const stripeKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const app = express();
app.use(express.json());
app.use(morgan('dev'));

// CORS configuration to allow multiple origins
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://tach-kart-frontend.vercel.app',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
}));


connectDB();
export const myCache = new NodeCache();
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", dashboardRoute);

app.use("/uploads", express.static("uploads"));
app.use(errorMiddleware);

app.get("/", (req, res) => {
    res.send("TechKart API is running");
});

app.listen(Port, () => {
    console.log('express is running on port ' + Port);
});

export default app;