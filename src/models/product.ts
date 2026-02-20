import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
    },
    photos: [{
        public_id: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: [true, "Please enter URL"]
        }
    }],
    price: {
        type: Number,
        required: [true, 'Product price is required'],
    },
    stock: {
        type: Number,
        required: [true, 'Product stock is required'],
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
    },
    ratings: {
        type: Number,
        default: 0,
    },
    numOfReviews: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
})



export const Product = mongoose.model('Product', productSchema);