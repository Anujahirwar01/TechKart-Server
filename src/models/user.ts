import mongoose from 'mongoose';
import validator from 'validator';

interface Iuser extends Document{
    _id:string;
    name:string;
    email:string;
    photo:string;
    role:'admin' | 'user';
    gender:'male' | 'female' | 'other';
    dob:Date;
    age:number;
    createdAt:Date;
    updatedAt:Date;
}

const schema = new mongoose.Schema({
    _id:{
        type:String,
        required:[true,'User id is required'],
    },
    name:{
        type:String,
        required:[true,'User name is required'],
    },
    email:{
        type:String,
        required:[true,'User email is required'],
        unique:true,
        validate:validator.default.isEmail,
    },
    photo:{
        type:String,
        required:[true,'User photo is required'],
    },
    role:{
        type:String,
        enum:['admin','user'],
        default:'user',
    },
    gender:{
        type:String,
        enum:['male','female','other'],
        required:[true,'Gender is required'],
    },
    dob:{
        type:Date,
        required:[true,'Date of Birth is required']
    },   

},{
    timestamps:true,
})

schema.virtual("age").get(function(){
    const today = new Date();
    const dob = this.dob;
    let age = today.getFullYear() - dob.getFullYear();
    if(today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())){
        age--;
    }
    return age;
})

export const User = mongoose.model<Iuser>('User', schema);