import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,deleteProductById,getProductById,getProducts, updateProduct } from "../controllers/products.controllers.js";
import { createProductSchema, getProductByIdParamsSchema, getProductsQuerySchema, updateProductByIdSchema } from '../schemas/productSchema.js';
import { auth, isAdmin } from '../middlewares/authMiddleware.js';

router.post("/",auth,isAdmin,validator(createProductSchema),createProduct);
router.get("/",validator(getProductsQuerySchema),getProducts);
router.get("/:productId",validator(getProductByIdParamsSchema),getProductById);
router.patch("/:productId",auth,isAdmin,validator(updateProductByIdSchema),updateProduct);
router.delete("/:productId",auth,isAdmin,validator(getProductByIdParamsSchema),deleteProductById);

export default router;