import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.js';
import type { NewUserRequestBody } from '../types/types.js';
import { TryCatch } from '../middlewares/error.js';
import ErrorHandler from '../utils/utility-class.js';


export const newUser = TryCatch(async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
) => {
    const { name, email, photo, gender, role, _id, dob } = req.body;

    if (!_id || !name || !email || !photo || !gender || !role || !dob) {
        next(new ErrorHandler("All fields are required", 400));
        return;
    }

    let existingUser = await User.findOne({ _id });
    if (existingUser) {
        return res.status(200).json({
            success: true,
            message: `welcome back, ${existingUser.name}`
        });
    }

    const newUserDoc = await User.create({
        name,
        email,
        photo,
        gender,
        role,
        _id,
        dob
    });
    return res.status(201).json({
        success: true,
        message: `welcome, ${newUserDoc.name}`
    });
});

export const getAllUsers = TryCatch(async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const users = await User.find({});
    return res.status(200).json({
        success: true,
        users
    });
}
);

export const getUser = TryCatch(async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
        next(new ErrorHandler("User not found", 404));
        return;
    }

    return res.status(200).json({
        success: true,
        user
    });
}
);

export const deleteUser = TryCatch(async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.log('deleteUser function called with ID:', req.params.id);
    const { id } = req.params;
    console.log('Searching for user with ID:', id);
    const user = await User.findByIdAndDelete(id);
    console.log('User found and deleted:', user);
    if (!user) {
        console.log('No user found with ID:', id);
        next(new ErrorHandler("User not found", 404));
        return;
    }
    return res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
}
);
