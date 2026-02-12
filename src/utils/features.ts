import mongoose, { Document } from 'mongoose';
import { myCache } from '../app.js';
import { Product } from '../models/product.js';
import type { InvalidateCacheProps, OrderItemType } from '../types/types.js';



export const connectDB = () => {
    mongoose.connect(process.env.MONGO_URI as string)
        .then(() => {
            console.log('MongoDB connected successfully');
        })
        .catch((err) => {
            console.error('MongoDB connection error:', err);
        });
}

export const invalidateCache = async ({
    product,
    order,
    admin,
    userId,
    orderId,
    productId
}: InvalidateCacheProps) => {
    if (product) {
        const productKeys: string[] = ["latest-products", "categories", "admin-products"];

        if (typeof productId === 'string') {
            productKeys.push(`product-${productId}`);
        } else if (Array.isArray(productId)) {
            productId.forEach(id => {
                productKeys.push(`product-${id}`);
                console.log("LOL")
            });
        }

        myCache.del(productKeys);
    }
    if (order) {
        const orderKeys: string[] = ["all-orders"];

        if (userId) {
            orderKeys.push(`myOrders-${userId}`);
        }
        if (orderId) {
            orderKeys.push(`order-${orderId}`);
        }

        const orders = await mongoose.model('Order').find({}).select("_id");
        orders.forEach((ord: any) => {
            orderKeys.push(`order-${ord._id}`);
        });

        myCache.del(orderKeys);
    }

    if (admin) {
        myCache.del(["admin-stats", "admin-pie-charts", "admin-bar-charts", "admin-line-charts"]);
    }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
    for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        if (!item) continue; // Skip if item is undefined

        const product = await Product.findById(item.productId);
        if (product) {
            product.stock -= item.quantity;
            await product.save();
        }
    }
}

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if (lastMonth === 0) {
        return thisMonth * 100;
    }
    const difference = (thisMonth) / lastMonth * 100;
    return Number(difference.toFixed(0));
}

export const getCategories = async (
    categories: string[],
    productsCount: number
) => {
    // const productsCount = await Product.countDocuments({});
    const categoriesCountPromise = categories.map((category) => Product.countDocuments({ category }));
    const categoriesCount = await Promise.all(categoriesCountPromise);

    const categoryCount: Record<string, number>[] = [];
    categories.forEach((category, index) => {
        categoryCount.push({
            [category]: Math.round((categoriesCount[index] ? categoriesCount[index] / productsCount : 0) || 0),
        });
    });
    return categoryCount;
}

interface MyDocument extends Document {
    createdAt: Date;
    discount?: number;
    total?: number;
}

type Funct1Params = {
    length: number;
    docArr: MyDocument[];
    property?: keyof MyDocument;
};

export const getChartData = ({ length, docArr, property }: Funct1Params) => {
    const today = new Date();
    const data: number[] = new Array(length).fill(0);
    docArr.forEach((item: MyDocument) => {
        const creationDate = item.createdAt;
        const monthDiff = (today.getFullYear() - creationDate.getFullYear()) * 12 + (today.getMonth() - creationDate.getMonth());
        if (monthDiff < length) {
            const index = length - monthDiff - 1;
            if (data[index] !== undefined) {
                data[index] += property && typeof item[property] === 'number' ? (item[property] as number) : 1;
            }
        }
    });
    return data;
}