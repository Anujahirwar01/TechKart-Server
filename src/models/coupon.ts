import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({

    code:{
        type:String,
        required:[true,"Please enter coupan"],
        unique:true
    },
    amount:{
        type:Number,
        required:[true,"Please enter discount amount"]
    },
})

export const Coupon = mongoose.model('Coupon', CouponSchema);