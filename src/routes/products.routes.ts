import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,deleteProductById,getProductById,getProducts, updateProduct } from "../controllers/products.controllers.js";
import { createProductSchema, getProductByIdParamsSchema, getProductsQuerySchema, updateProductByIdSchema } from '../schemas/productSchema.js';

router.post("/",validator(createProductSchema),createProduct);
router.get("/",validator(getProductsQuerySchema),getProducts);
router.get("/:productId",validator(getProductByIdParamsSchema),getProductById);
router.patch("/:productId",validator(updateProductByIdSchema),updateProduct);
router.delete("/:productId",validator(getProductByIdParamsSchema),deleteProductById);

export default router;