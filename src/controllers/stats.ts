
import type { Request, Response, NextFunction } from 'express';
import { TryCatch } from '../middlewares/error.js';
import { myCache } from '../app.js';
import { Product } from '../models/product.js';
import { User } from '../models/user.js';
import { Order } from '../models/order.js';
import { calculatePercentage, getChartData } from '../utils/features.js';


export const getDashboardStats = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {
    let stats = {};
    const key = `admin-stats`;
    if (myCache.has(key)) {
        stats = JSON.parse(myCache.get(key) as string);
    } else {
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
        }
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0)
        }
        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        })


        const lastMonthProductsPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        })

        const thisMonthUserPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        })

        const lastMonthUserPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        })

        const thisMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        })

        const lastMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        })

        const lastSixMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        })

        const latestTransactionsPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4);

        const [
            thisMonthProducts,
            lastMonthProducts,
            thisMonthUsers,
            lastMonthUsers,
            thisMonthOrders,
            lastMonthOrders,
            productsCount,
            usersCount,
            allOrders,
            lastSixMonthOrders,
            categories,
            femaleUsersCount,
            latestTransaction,
        ] = await Promise.all([
            thisMonthProductsPromise,
            lastMonthProductsPromise,
            thisMonthUserPromise,
            lastMonthUserPromise,
            thisMonthOrdersPromise,
            lastMonthOrdersPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find({}).select("total"),
            lastSixMonthOrdersPromise,
            Product.distinct('category'),
            User.countDocuments({ gender: "female" }),
            latestTransactionsPromise,
        ]);

        const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + order.total, 0);
        const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + order.total, 0);

        const changePercent = {
            revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
            product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),
            order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length),
            user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
        }

        const revenue = allOrders.reduce((total, order) => total + order.total, 0);
        const count = {
            revenue,
            user: usersCount,
            product: productsCount,
            order: allOrders.length,
        }

        const orderMonthsCounts = new Array(6).fill(0);
        const orderMonthsRevenue = new Array(6).fill(0);


        lastSixMonthOrders.forEach(order => {
            const creationDate = order.createdAt;
            const monthDiff = (today.getFullYear() - creationDate.getFullYear()) * 12 + (today.getMonth() - creationDate.getMonth());
            if (monthDiff < 6) {
                orderMonthsCounts[6 - monthDiff - 1] += 1;
                orderMonthsRevenue[6 - monthDiff - 1] += order.total;
            }
        });

        const categoriesCountPromise = categories.map((category) => Product.countDocuments({ category }));
        const categoriesCount = await Promise.all(categoriesCountPromise);

        const categoryCount: Record<string, number>[] = [];
        categories.forEach((category, index) => {
            categoryCount.push({
                [category]: Math.round((categoriesCount[index] ? (categoriesCount[index] / productsCount) * 100 : 0) || 0),
            });
        });

        const userRatio = {
            male: usersCount - femaleUsersCount,
            female: femaleUsersCount,
        };

        const modifiedLatestTransactions = latestTransaction.map(order => {
            return {
                _id: order._id,
                discount: order.discount,
                amount: order.total,
                quantity: order.orderItems.length,
                status: order.status,
            }
        });


        stats = {
            categoryCount,
            changePercent,
            count,
            chart: {
                order: orderMonthsCounts,
                revenue: orderMonthsRevenue,
            },
            userRatio,
            latestTransaction: modifiedLatestTransactions,
        }

        myCache.set(key, JSON.stringify(stats));
    }

    return res.status(200).json({
        success: true,
        stats
    });
});

export const getPieStats = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {

    let charts;

    const key = `admin-pie-charts`;

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    } else {

        const allOrderPromise = Order.find({}).select(["total", "discount", "subtotal",
            "tax", "shippingCharges", "status", "createdAt"
        ])

        const [processingOrder, shippedOrder, deliveredOrder, categories
            , productsCount, outOfStock, allOrders,
            allUsers, adminCount, userCount
        ] = await Promise.all([Order.countDocuments({ status: "Processing" }),
        Order.countDocuments({ status: "Shipped" }),
        Order.countDocuments({ status: "Delivered" }),
        Product.distinct('category'),
        Product.countDocuments(),
        Product.countDocuments(
            {
                stock: 0
            }
        ),
            allOrderPromise,
        User.find({}).select(["dob"]),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "user" }),
        ]);

        const orderFullfillment = {
            processing: processingOrder,
            shipped: shippedOrder,
            delivered: deliveredOrder,
        }

        const categoriesCountPromise = categories.map((category) => Product.countDocuments({ category }));
        const categoriesCount = await Promise.all(categoriesCountPromise);

        const categoryCount: Record<string, number>[] = [];
        categories.forEach((category, index) => {
            categoryCount.push({
                [category]: Math.round((categoriesCount[index] ? (categoriesCount[index] / productsCount) * 100 : 0) || 0),
            });
        });

        const stockAvailable = {
            inStock: productsCount - outOfStock,
            outOfStock: outOfStock,
        }

        const totalGrossIncome = allOrders.reduce((acc, order) => acc + (order.subtotal || 0), 0);
        const discount = allOrders.reduce((acc, order) => acc + (order.discount || 0), 0);
        const productionCost = allOrders.reduce((acc, order) => acc + (order.shippingCharges || 0), 0);
        const burnt = allOrders.reduce((acc, order) => acc + (order.tax || 0), 0);
        const marketingCost = Math.round(totalGrossIncome * (30 / 100));
        const netMargin = totalGrossIncome - (discount + productionCost + burnt + marketingCost);
        const revenueDistribution = {
            netMargin,
            discount,
            productionCost: productionCost,
            burnt,
            marketingCost,
        }

        const usersAgeGroup = {
            teen: allUsers.filter((i) => i.age < 20).length,
            adult: allUsers.filter((i) => i.age >= 20 && i.age < 40).length,
            old: allUsers.filter((i) => i.age >= 40).length
        }

        const adminCustomer = {
            admin: adminCount,
            customer: userCount,
        }

        charts = {
            orderFullfillment,
            productCategories: categoryCount,
            stockAvailablity: stockAvailable,
            revenueDistribution,
            adminCustomer,
            usersAgeGroup
        }
        myCache.set(key, JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts
    });
});

export const getBarStats = TryCatch(async (_req: Request
    , res: Response, _next: NextFunction) => {

    let charts;
    const key = `admin-bar-charts`;

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    } else {

        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

        const lastTwelveMonthsOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            }
        }).select("createdAt");

        const lastSixMonthsProductsPromise = Product.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        }).select("createdAt");

        const lastSixMonthsUsersPromise = User.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        }).select("createdAt");

        const [
            lastTwelveMonthsOrders,
            lastSixMonthsProducts,
            lastSixMonthsUsers
        ] = await Promise.all([
            lastTwelveMonthsOrdersPromise,
            lastSixMonthsProductsPromise,
            lastSixMonthsUsersPromise
        ]);

        const productCounts: number[] = getChartData({
            length: 6,
            docArr: lastSixMonthsProducts as any
        })

        const userCounts: number[] = getChartData({
            length: 6,
            docArr: lastSixMonthsUsers as any
        })

        const orderCounts: number[] = getChartData({
            length: 12,
            docArr: lastTwelveMonthsOrders as any
        })

        charts = {
            products: productCounts,
            users: userCounts,
            orders: orderCounts
        }
        myCache.set(key, JSON.stringify(charts));
    }

    return res.status(200).json({
        success: true,
        charts
    });
});

export const getLineStats = TryCatch(async (req: Request
    , res: Response, next: NextFunction) => {
    let charts;
    const key = `admin-line-charts`;

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    } else {

        const today = new Date();
        const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

        const baseQuery = {
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            }
        }

        const lastTwelveMonthsProductsPromise = Product.find(baseQuery).select("createdAt");
        const lastTwelveMonthsOrdersPromise = Order.find(baseQuery).select(["createdAt", "discount", "total"]);
        const lastTwelveMonthsUsersPromise = User.find(baseQuery).select("createdAt");

        const [
            users,
            products,
            orders
        ] = await Promise.all([
            lastTwelveMonthsUsersPromise,
            lastTwelveMonthsProductsPromise,
            lastTwelveMonthsOrdersPromise
        ]);

        const productCounts: number[] = getChartData({
            length: 12,
            docArr: products as any
        })

        const userCounts: number[] = getChartData({
            length: 12,
            docArr: users as any
        })

        const discount: number[] = getChartData({
            length: 12,
            docArr: orders as any,
            property: "discount"
        })

        const revenue: number[] = getChartData({
            length: 12,
            docArr: orders as any,
            property: "total"
        })

        charts = {
            products: productCounts,
            users: userCounts,
            discount,
            revenue
        }
        myCache.set(key, JSON.stringify(charts));
    }

    return res.status(200).json({
        success: true,
        charts
    });
});