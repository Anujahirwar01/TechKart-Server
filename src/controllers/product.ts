import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { Product } from "../models/product.js";
import type { Request, Response, NextFunction } from "express";
import type { BaseQuery, NewProductRequestBody } from "../types/types.js";
import { rm } from "node:fs";
import { myCache } from "../app.js";
import type { SearchRequestQuery } from "../types/types.js";
import { invalidateCache } from "../utils/features.js";




//revalidate on new  , update ,new order,   delete product
export const getlatestProducts = TryCatch(async (
    req,
    res,
    next
) => {

    let products;

    if (myCache.has("latest-products")) {
        products = JSON.parse(myCache.get("latest-products") as string);
    } else {
        products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
        myCache.set("latest-products", JSON.stringify(products));

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
    if (myCache.has("categories")) {
        categories = JSON.parse(myCache.get("categories") as string);
    }
    else {
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories));
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
    if (myCache.has("admin-products")) {
        products = JSON.parse(myCache.get("admin-products") as string);
    } else {
        products = await Product.find({});
        myCache.set("admin-products", JSON.stringify(products));
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
    if (myCache.has(`product-${req.params.id}`)) {
        product = JSON.parse(myCache.get(`product-${req.params.id}`) as string);
    }
    else {
        product = await Product.findById(req.params.id);
        if (!product) {
            next(new ErrorHandler("Product not found", 404));
            return;
        }
        myCache.set(`product-${req.params.id}`, JSON.stringify(product));
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
    const { name, category, price, stock } = req.body;
    const photo = req.file;

    const product = await Product.findById(id);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }
    if (photo) {
        rm(product.photo, () => {
            console.log('Old product photo deleted');
        });
        product.photo = photo.path;
    }
    if (name) product.name = name;
    if (category) product.category = category.toLowerCase();
    if (price) product.price = price;
    if (stock) product.stock = stock;
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
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
        next(new ErrorHandler("Product not found", 404));
        return;
    }
    rm(product.photo, () => {
        console.log('Product photo deleted');
    });

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

    const [products, allProducts] = await Promise.all([
        productsPromise,
        Product.find(baseQuery)
    ]);

    const totalPage = Math.ceil(allProducts.length / limit);

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


    const { name, category, price, stock } = req.body;
    const photo = req.file;

    if (!photo) {
        next(new ErrorHandler("Product photo is required", 400));
        return;
    }

    if (!name || !category || !price || !stock) {
        rm(photo.path, () => {
            console.log('Temporary file deleted due to missing fields');
        });
        next(new ErrorHandler("All fields are required", 400));
        return;
    }

    const product = await Product.create({
        name,
        category: category.toLowerCase(),
        price,
        stock,
        photo: photo.path
    });

    await invalidateCache({ product: true, admin: true });

    return res.status(201).json({
        success: true,
        message: "Product created successfully",
        product
    });
})