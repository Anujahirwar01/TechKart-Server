import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({

    shippingInfo: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        pinCode: { type: String, required: true },
    },
    user: {
        type: String,
        ref: 'User',
        required: true,
    },
    subtotal: {
        type: Number,
        required: true,
    },
    tax: {
        type: Number,
        required: true,
    },
    shippingCharges: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["processing", "shipped", "delivered"],
        default: "processing",
    },
    orderItems: [
        {
            name: { type: String, required: true },
            photo: { type: String, required: false, default: "" },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            }
        }
    ]
}, {
    timestamps: true,
})



export const Order = mongoose.model('Order', orderSchema);