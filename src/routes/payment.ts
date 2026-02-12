import express from 'express';
import { allCoupons, applyDiscount, newCoupon , deleteCoupon , createPaymentIntent } from '../controllers/payment.js';
import { adminOnly } from '../middlewares/auth.js';


const router = express.Router();

router.post('/create', createPaymentIntent);

router.post('/coupon/new', adminOnly, newCoupon);

router.get('/discount', applyDiscount);

router.get("/coupon/all" ,adminOnly, allCoupons);

router.delete("/coupon/:id" ,adminOnly, deleteCoupon);

export default router;