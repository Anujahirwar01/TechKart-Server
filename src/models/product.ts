import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,'Product name is required'],
    },
    photo:{
        type:String,
        required:[true,'Product photo is required'],
    },
    price:{
        type:Number,
        required:[true,'Product price is required'],    
    },
    stock:{
        type:Number,
        required:[true,'Product stock is required'],
    },
    category:{
        type:String,
        required:[true,'Product category is required'],
        trim:true,
    },
},{
    timestamps:true,
})



export const Product = mongoose.model('Product', productSchema);