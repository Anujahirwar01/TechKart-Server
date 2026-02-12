import type { Request, Response, NextFunction } from 'express';
import { TryCatch } from "./error.js";
import ErrorHandler from "../utils/utility-class.js";
import { User } from "../models/user.js";


export const adminOnly = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.query;
    if (!id) {
        next(new ErrorHandler("Login Required", 401));
        return;
    }
    const user = await User.findById(id);
    if (!user) {
        next(new ErrorHandler("User not found", 404));
        return;
    }
    if (user.role !== "admin") {
        next(new ErrorHandler("Access denied, admin only", 403));
        return;
    }
    next();
})