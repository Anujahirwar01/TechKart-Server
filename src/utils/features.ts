import mongoose, { Document } from 'mongoose';
import { Product } from '../models/product.js';
import { Review } from '../models/review.js';
import type { InvalidateCacheProps, OrderItemType } from '../types/types.js';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import {Redis} from 'ioredis';
import { redis } from "../app.js";

const getBase64 = (file: Express.Multer.File) => {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}


export const uploadToClodinary = async (files: Express.Multer.File[]) => {
    try {
        // Verify Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error('Cloudinary is not properly configured. Please check your environment variables.');
        }

        const promises = files.map(async (file) => {
            return new Promise<UploadApiResponse | undefined>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'auto' },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                uploadStream.end(file.buffer);
            });
        });

        const results = await Promise.all(promises);
        return results.map((i) => ({
            public_id: i?.public_id || '',
            url: i?.secure_url || ''
        }));
    } catch (error) {
        console.error('Error uploading files to Cloudinary:', error);
        throw error;
    }
}

export const deleteFromCloudinary = async (public_ids: string[]) => {
    const promises = public_ids.map((id) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(id, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    });
    return await Promise.all(promises);
}

export const connectRedis = (redisURI: string) => {
    const redis = new Redis(redisURI);

    redis.on("connect", () => console.log("Redis Connected"));
    redis.on("error", (e: Error) => console.log(e));

    return redis;
};


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
  review,
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (review) {
    await redis.del([`reviews-${productId}`]);
  }

  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "all-products",
    ];

    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productId.forEach((i) => productKeys.push(`product-${i}`));

    await redis.del(productKeys);
  }
  if (order) {
    const ordersKeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];

    await redis.del(ordersKeys);
  }
  if (admin) {
    await redis.del([
      "admin-stats",
      "admin-pie-charts",
      "admin-bar-charts",
      "admin-line-charts",
    ]);
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

export const findAverageRatings = async (productId: string) => {
    const reviews = await Review.find({ product: productId });

    let sum = 0;
    reviews.forEach((review) => {
        sum += review.rating;
    });

    const ratings = reviews.length === 0 ? 0 : Math.round(sum / reviews.length);
    const numOfReviews = reviews.length;

    return { ratings, numOfReviews };
}