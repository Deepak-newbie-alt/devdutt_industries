import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,getProductById,getProducts, updateProduct } from "../controllers/products.controllers.js";
import { createProductSchema, getProductByIdParamsSchema, getProductsQuerySchema, updateProductByIdSchema } from '../schemas/productSchema.js';

router.post("/",validator(createProductSchema),createProduct);
router.get("/",validator(getProductsQuerySchema),getProducts);
router.get("/:productId",validator(getProductByIdParamsSchema),getProductById);
router.patch("/:productId",validator(updateProductByIdSchema),updateProduct);

export default router;