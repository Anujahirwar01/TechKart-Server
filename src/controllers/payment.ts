
import type { Request, Response, NextFunction } from "express";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";
import { stripe } from "../app.js";

export const createPaymentIntent = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return next(new ErrorHandler("Please provide a valid amount", 400));
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Number(amount) * 100,
            currency: 'inr',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return res.status(201).json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });
    }
)


export const newCoupon = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {
        const { code, amount } = req.body;
        if (!code || !amount) {
            return next(new ErrorHandler("Please provide all required fields", 400));
        }
        await Coupon.create({ code, amount });
        return res.status(201).json({
            success: true,
            message: "Coupon created successfully"
        });
    }
)

export const applyDiscount = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {
        const { code } = req.query;

        console.log('Discount request received for code:', code);

        if (!code || typeof code !== 'string') {
            console.log('Invalid code format:', code);
            return next(new ErrorHandler("Please provide a valid coupon code", 400));
        }

        const discount = await Coupon.findOne({ code });
        console.log('Coupon found:', discount);

        if (!discount) {
            console.log('Coupon not found in database:', code);
            return next(new ErrorHandler("Invalid coupon code", 400));
        }

        return res.status(200).json({
            success: true,
            discount: discount.amount
        });
    }
)

export const allCoupons = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {

        const coupons = await Coupon.find({});

        return res.status(200).json({
            success: true,
            coupons
        });
    }
)

export const deleteCoupon = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {

        const { id } = req.params;

        const coupon = await Coupon.findByIdAndDelete(id);

        if (!coupon) {
            return next(new ErrorHandler("Invalid Coupan ID", 404));
        }

        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully"
        });
    }
)

export const getSingleCoupon = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {

        const { id } = req.params;

        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return next(new ErrorHandler("Invalid Coupon ID", 404));
        }

        return res.status(200).json({
            success: true,
            coupon
        });
    }
)

export const updateCoupon = TryCatch(
    async (req: Request, res: Response, next: NextFunction) => {

        const { id } = req.params;
        const { code, amount } = req.body;

        if (!code || !amount) {
            return next(new ErrorHandler("Please provide all required fields", 400));
        }

        const coupon = await Coupon.findByIdAndUpdate(
            id,
            { code, amount },
            { new: true }
        );

        if (!coupon) {
            return next(new ErrorHandler("Invalid Coupon ID", 404));
        }

        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            coupon
        });
    }
)

