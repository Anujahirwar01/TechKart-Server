import express from 'express';
import { getAllCategories, getAllProducts, newProduct, updateProduct } from '../controllers/product.js';
import { singleUpload } from '../middlewares/multer.js';
import { adminOnly } from '../middlewares/auth.js';
import { getlatestProducts } from '../controllers/product.js';
import { getAdminProducts } from '../controllers/product.js';
import { getSingleProduct } from '../controllers/product.js';
import { deleteProduct } from '../controllers/product.js';

const router = express.Router();

router.post('/new', adminOnly, singleUpload, newProduct);

router.get("/all", getAllProducts);

router.get("/latest", getlatestProducts);

router.get("/categories" , getAllCategories)

router.get("/admin-products", getAdminProducts);

router.route("/:id").get(getSingleProduct).put(adminOnly, singleUpload, updateProduct).delete(adminOnly, deleteProduct);

export default router;