import express from 'express';
import { getAllCategories, getAllProducts, newProduct, updateProduct, allReviewsOfProduct, newReview, deleteReview } from '../controllers/product.js';
import { singleUpload } from '../middlewares/multer.js';
import { adminOnly } from '../middlewares/auth.js';
import { getlatestProducts } from '../controllers/product.js';
import { getAdminProducts } from '../controllers/product.js';
import { getSingleProduct } from '../controllers/product.js';
import { deleteProduct } from '../controllers/product.js';
import { multiUpload } from '../middlewares/multer.js';

const router = express.Router();

router.post('/new', adminOnly, multiUpload, newProduct);

router.get("/all", getAllProducts);

router.get("/latest", getlatestProducts);

router.get("/categories" , getAllCategories)

router.get("/admin-products", getAdminProducts);

router.route("/:id").get(getSingleProduct).put(adminOnly, multiUpload, updateProduct).delete(adminOnly, deleteProduct);

router.get("/reviews/:id", allReviewsOfProduct);
router.post("/review/new", newReview);
router.delete("/review/:id", deleteReview);

export default router;