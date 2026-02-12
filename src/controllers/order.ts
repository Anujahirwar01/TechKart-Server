
import type { Request, Response, NextFunction } from "express";
import { TryCatch } from "../middlewares/error.js";
import type { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { reduceStock } from "../utils/features.js";
import { invalidateCache } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";


export const myOrders = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {

    const { id: user } = req.query;

    if (!user) {
        return next(new ErrorHandler("Please provide user id", 400));
    }

    let orders = [];
    if (myCache.has(`myOrders-${user}`)) {
        orders = JSON.parse(myCache.get(`myOrders-${user}`) as string);
    } else {
        orders = await Order.find({ user }).populate("orderItems.productId");
        myCache.set(`myOrders-${user}`, JSON.stringify(orders));
    }

    return res.status(200).json({
        success: true,
        orders
    });
});

export const allOrders = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {
    let key = `all-orders`;
    let orders = [];
    if (myCache.has(key)) {
        orders = JSON.parse(myCache.get(key) as string);
    } else {
        orders = await Order.find({}).populate("orderItems.productId").populate("user");
        myCache.set(key, JSON.stringify(orders));
    }
    return res.status(200).json({
        success: true,
        orders
    });
});

export const getSingleOrder = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {
    const { id } = req.params;
    let key = `order-${id}`;
    let order;
    if (myCache.has(key)) {
        order = JSON.parse(myCache.get(key) as string);
    } else {
        order = await Order.findById(id).populate("orderItems.productId").populate("user");
        if (!order) {
            return next(new ErrorHandler("Order not found", 404));
        }
        myCache.set(key, JSON.stringify(order));
    }

    if (!order) {
        return next(new ErrorHandler("Order not found", 404));
    }

    return res.status(200).json({
        success: true,
        order
    });
});



export const newOrder = TryCatch(async (req: Request<{}, {}, NewOrderRequestBody>
    , res: Response, next: NextFunction) => {

    const { shippingInfo, orderItems, user,
        subtotal, tax, shippingCharges,
        discount, total
    } = req.body

    if (!shippingInfo || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0 || !user ||
        subtotal == null || tax == null || shippingCharges == null ||
        discount == null || total == null) {
        return next(new ErrorHandler("Please provide all the required fields", 400));
    }


    const order = await Order.create({
        shippingInfo, orderItems, user,
        subtotal, tax, shippingCharges,
        discount, total
    });

    await reduceStock(orderItems);

    await invalidateCache({
        order: true, product: true, admin: true,
        userId: user,
        productId: order.orderItems.map(item => String(item.productId)),
        orderId: order._id.toString()
    });

    return res.status(201).json({
        success: true,
        message: "Order created successfully"
    });
});





export const processOrder = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {

    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
        return next(new ErrorHandler("Order not found", 404));
    }

    switch (order.status) {
        case "processing":
            order.status = "shipped";
            break;
        case "shipped":
            order.status = "delivered";
            break;
        default:
            return next(new ErrorHandler("Order is already delivered", 400));
    }

    await order.save();

    await invalidateCache({
        order: true, product: false, admin: true,
        userId: order.user.toString(),
        orderId: order._id.toString()
    });

    return res.status(200).json({
        success: true,
        message: "Order processed successfully"
    });
});

export const deleteOrder = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {

    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
        return next(new ErrorHandler("Order not found", 404));
    }


    await order.deleteOne();

    await invalidateCache({
        order: true, product: false, admin: true,
        userId: order.user.toString(),
        orderId: order._id.toString()
    });

    return res.status(200).json({
        success: true,
        message: "Order deleted successfully"
    });
});

