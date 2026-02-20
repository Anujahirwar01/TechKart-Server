import express from 'express';
import { allCoupons, applyDiscount, newCoupon , deleteCoupon , createPaymentIntent, getSingleCoupon, updateCoupon } from '../controllers/payment.js';
import { adminOnly } from '../middlewares/auth.js';


const router = express.Router();

router.post('/create', createPaymentIntent);

router.post('/coupon/new', adminOnly, newCoupon);

router.get('/discount', applyDiscount);

router.get("/coupon/all" ,adminOnly, allCoupons);

router.get("/coupon/:id", adminOnly, getSingleCoupon);

router.put("/coupon/:id", adminOnly, updateCoupon);

router.delete("/coupon/:id" ,adminOnly, deleteCoupon);

export default router;