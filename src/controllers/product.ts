import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { Product } from "../models/product.js";
import { Review } from "../models/review.js";
import { User } from "../models/user.js";
import type { Request, Response, NextFunction } from "express";
import type { BaseQuery, NewProductRequestBody } from "../types/types.js";
import { rm } from "node:fs";
import type { SearchRequestQuery } from "../types/types.js";
import { deleteFromCloudinary, invalidateCache, uploadToClodinary, findAverageRatings } from "../utils/features.js";
import { redis, redisTTL } from "../app.js";




//revalidate on new  , update ,new order,   delete product
export const getlatestProducts = TryCatch(async (
    req,
    res,
    next
) => {

    let products;
    products = await redis.get("latest-products");

    if (products) products = JSON.parse(products);
    else {
        products = await Product.find({}).sort({ createdAt: -1 }).limit(10);
        await redis.setex("latest-products", redisTTL, JSON.stringify(products));
    }

    // throw new Error("Test error handling");

    return res.status(201).json({
        success: true,
        message: "Latest products fetched successfully",
        products
    });
});


//revalidate on new  , update ,new order,   delete product

export const getAllCategories = TryCatch(async (
    req,
    res,
    next
) => {
    let categories;

    categories = await redis.get("categories");

    if (categories) categories = JSON.parse(categories);
    else {
        categories = await Product.distinct("category");
        await redis.setex("categories", redisTTL, JSON.stringify(categories));
    }
    return res.status(201).json({
        success: true,
        message: "Categories fetched successfully",
        categories
    });
});

//revalidate on new  , update ,new order,   delete product
export const getAdminProducts = TryCatch(async (
    req,
    res,
    next
) => {
    let products;

    products = await redis.get("all-products");

    if (products) products = JSON.parse(products);
    else {
        products = await Product.find({});
        await redis.setex("all-products", redisTTL, JSON.stringify(products));
    }
    return res.status(200).json({
        success: true,
        products
    });
}
);


export const getSingleProduct = TryCatch(async (
    req,
    res,
    next
) => {
    let product;
    const id = req.params.id;
    const key = `product-${id}`;

    product = await redis.get(key);
    if (product) product = JSON.parse(product);
    else {
        product = await Product.findById(id);
        if (!product) return next(new ErrorHandler("Product Not Found", 404));

        await redis.setex(key, redisTTL, JSON.stringify(product));
    }
    return res.status(200).json({
        success: true,
        product
    });
}
);

export const updateProduct = TryCatch(async (
    req: Request<{ id: string }, {}, NewProductRequestBody>,
    res,
    next
) => {
    const { id } = req.params;
    const { name, category, price, stock, description } = req.body;
    const photos = req.files as Express.Multer.File[];

    const product = await Product.findById(id);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }
    if (photos && photos.length > 0) {
        if (product.photos[0]?.url) {
            rm(product.photos[0].url, () => {
                console.log('Old product photo deleted');
            });
        }
        const photosURL = await uploadToClodinary(photos);
        product.photos = photosURL as any;
    }
    if (name) product.name = name;
    if (category) product.category = category.toLowerCase();
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (description) product.description = description;
    await product.save();
    await invalidateCache({
        product: true,
        productId: product._id.toString(),
        admin: true
    });
    return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product

    });
}
);

export const deleteProduct = TryCatch(async (
    req,
    res,
    next
) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
        next(new ErrorHandler("Product not found", 404));
        return;
    }

    const ids = product.photos.map((photo) => photo.public_id);
    if (ids.length > 0) {
        await deleteFromCloudinary(ids);
    }

    await Product.findByIdAndDelete(id);

    await invalidateCache({
        product: true,
        productId: String(product._id),
        admin: true
    });

    return res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    });
}
);

export const getAllProducts = TryCatch(async (
    req: Request<{}, {}, {}, SearchRequestQuery>,
    res,
    next
) => {
    const { search, price, category, sort } = req.query;
    const page = Number(req.query.page) || 1;
    const key = `products-${search || "all"}-${price || "all"}-${category || "all"}-${sort || "default"}-page${page}`;
    let products;
    let totalPage;
    const cachedData = await redis.get(key);
    if (cachedData) {
        const data = JSON.parse(cachedData);
        products = data.products;
        totalPage = data.totalPage;
    } else {
        const limit = process.env.PRODUCTS_PER_PAGE ? Number(process.env.PRODUCTS_PER_PAGE) : 8;
        const skip = (page - 1) * limit;

        const baseQuery: BaseQuery = {


        };

        if (search) {
            baseQuery.name = {
                $regex: search,
                $options: "i",
            };
        }
        if (price) {
            baseQuery.price = {
                $lte: Number(price),
            };
        }
        if (category) {
            baseQuery.category = category.toLowerCase();
        }

        const productsPromise = Product.find(baseQuery).sort(
            sort ? { price: sort === "asc" ? 1 : -1 } : { createdAt: -1 }
        ).skip(skip).limit(limit)

        const [productFetched, allProducts] = await Promise.all([
            productsPromise,
            Product.find(baseQuery)
        ]);
        products = productFetched;
        const totalPage = Math.ceil(allProducts.length / limit);
        await redis.setex(key, redisTTL, JSON.stringify({ products, totalPage }));
    }

    return res.status(200).json({
        success: true,
        products,
        totalPage,
    });

});


export const newProduct = TryCatch(async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction
) => {


    const { name, category, price, stock, description } = req.body;
    const photos = req.files as Express.Multer.File[];

    console.log('New product request:', { name, category, price, stock, photos: photos?.length });

    if (!photos) {
        next(new ErrorHandler("Product photo is required", 400));
        return;
    }

    if (photos.length < 1) {
        next(new ErrorHandler("At least one product photo is required", 400));
        return;
    }

    if (photos.length > 5) {
        next(new ErrorHandler("You can upload a maximum of 5 photos", 400));
        return;
    }

    if (!name || !category || !price || !stock || !description) {
        photos.forEach(photo => {
            rm(photo.path, () => {
                console.log('Temporary file deleted due to missing fields');
            });
        });
        next(new ErrorHandler("All fields are required", 400));
        return;
    }

    const photosURL = await uploadToClodinary(photos);

    try {
        const product = await Product.create({
            name,
            category: category.toLowerCase(),
            price,
            stock,
            description,
            photos: photosURL
        });

        console.log('Product created successfully:', product._id);

        await invalidateCache({ product: true, admin: true });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });
    } catch (error: any) {
        // Clean up uploaded files if product creation fails
        photos.forEach(photo => {
            rm(photo.path, () => {
                console.log('Temporary file deleted due to product creation failure');
            });
        });
        console.error('Product creation error:', error);
        next(new ErrorHandler(`Product creation failed: ${error.message}`, 500));
    }
})

export const allReviewsOfProduct = TryCatch(async (req, res, next) => {
    let reviews;
    const key = `reviews-${req.params.id}`;

    reviews = await redis.get(key);

    if (reviews) reviews = JSON.parse(reviews);
    else {
        reviews = await Review.find({
            product: req.params.id,
        })
            .populate("user", "name photo")
            .sort({ updatedAt: -1 });

        await redis.setex(key, redisTTL, JSON.stringify(reviews));
    }

    return res.status(200).json({
        success: true,
        reviews,
    });
});


export const newReview = TryCatch(async (req, res, next) => {
    const user = await User.findById(req.query.id);

    if (!user) return next(new ErrorHandler("Not Logged In", 404));

    const { comment, rating, productId } = req.body;

    if (!productId) {
        return next(new ErrorHandler("Product ID is required", 400));
    }

    const product = await Product.findById(productId);
    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    const alreadyReviewed = await Review.findOne({
        user: user._id,
        product: product._id,
    });

    if (alreadyReviewed) {
        alreadyReviewed.comment = comment;
        alreadyReviewed.rating = rating;

        await alreadyReviewed.save();
    } else {
        await Review.create({
            comment,
            rating,
            user: user._id,
            product: product._id,
        });
    }

    const { ratings, numOfReviews } = await findAverageRatings(product._id.toString());

    product.ratings = ratings;
    product.numOfReviews = numOfReviews;

    await product.save();

    await invalidateCache({
        product: true,
        productId: String(product._id),
        admin: true,
        review: true,
    });

    return res.status(alreadyReviewed ? 200 : 201).json({
        success: true,
        message: alreadyReviewed ? "Review Updated" : "Review Added",
    });
});

export const deleteReview = TryCatch(async (req, res, next) => {
    const user = await User.findById(req.query.id);

    if (!user) return next(new ErrorHandler("Not Logged In", 404));

    const review = await Review.findById(req.params.id);
    if (!review) return next(new ErrorHandler("Review Not Found", 404));

    const isAuthenticUser = review.user.toString() === user._id.toString();

    if (!isAuthenticUser) return next(new ErrorHandler("Not Authorized", 401));

    await review.deleteOne();

    const product = await Product.findById(review.product);

    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    const { ratings, numOfReviews } = await findAverageRatings(product._id.toString());

    product.ratings = ratings;
    product.numOfReviews = numOfReviews;

    await product.save();

    await invalidateCache({
        product: true,
        productId: String(product._id),
        admin: true,
        review: true,
    });

    return res.status(200).json({
        success: true,
        message: "Review Deleted",
    });
});