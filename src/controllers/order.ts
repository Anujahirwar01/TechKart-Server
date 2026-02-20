import type { Request, Response, NextFunction } from "express";
import { TryCatch } from "../middlewares/error.js";
import type { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { User } from "../models/user.js";
import { reduceStock } from "../utils/features.js";
import { invalidateCache } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { redis, redisTTL } from "../app.js";


export const myOrders = TryCatch(async (req: Request
    , res: Response) => {

    const { id: user } = req.query as { id: string };

    const key = `my-orders-${user}`;

    let orders;

    orders = await redis.get(key);

    if (orders) orders = JSON.parse(orders);
    else {
        orders = await Order.find({ user });
        await redis.setex(key, redisTTL, JSON.stringify(orders));
    }

    return res.status(200).json({
        success: true,
        orders
    });
});

// Updated: Check user role - admins see all, users see their own
export const allOrders = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {

    const key = `all-orders`;

  let orders;

  orders = await redis.get(key);

  if (orders) orders = JSON.parse(orders);
  else {
    orders = await Order.find().populate("user", "name");
    await redis.setex(key, redisTTL, JSON.stringify(orders));
  }

    return res.status(200).json({
        success: true,
        orders
    });
});

export const getSingleOrder = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {
    const { id } = req.params;
  const key = `order-${id}`;

  let order;
  order = await redis.get(key);

  if (order) order = JSON.parse(order);
  else {
    order = await Order.findById(id).populate("user", "name");

    if (!order) return next(new ErrorHandler("Order Not Found", 404));

    await redis.setex(key, redisTTL, JSON.stringify(order));
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

    console.log('New order request:', { shippingInfo, orderItems, user, subtotal, tax, shippingCharges, discount, total });

    if (!shippingInfo || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0 || !user ||
        subtotal == null || tax == null || shippingCharges == null ||
        discount == null || total == null) {
        console.log('Missing required fields');
        return next(new ErrorHandler("Please provide all the required fields", 400));
    }

    try {
        const order = await Order.create({
            shippingInfo, orderItems, user,
            subtotal, tax, shippingCharges,
            discount, total
        });

        console.log('Order created successfully:', order._id);

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
    } catch (error: any) {
        console.error('Order creation error:', error);
        return next(new ErrorHandler(`Order creation failed: ${error.message}`, 500));
    }
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