import { type NextFunction, type Request, type Response } from 'express';
import type { ControllerType } from '../types/types.js';
import ErrorHandler from '../utils/utility-class.js';


export const errorMiddleware = (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
    err.message = err.message || 'Internal Server Error';
    err.statusCode = err.statusCode || 500;
    if(err.name === 'CastError'){
        err.message = "Invalid ID";
        err.statusCode = 400;
    }
    return res.status(400).json({
        success: false,
        message: err.message
    })
}

export const TryCatch = (func: ControllerType) => (req: Request, res: Response, next: NextFunction) => {
return Promise.resolve(func(req, res, next)).catch(next);
}