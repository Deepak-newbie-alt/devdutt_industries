import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,getProductById,getProducts } from "../controllers/products.controllers.js";
import { createProductSchema, getProductByIdParamsSchema, getProductsQuerySchema } from '../schemas/productSchema.js';

router.post("/",validator(createProductSchema),createProduct);
router.get("/",validator(getProductsQuerySchema),getProducts);
router.get("/:productId",validator(getProductByIdParamsSchema),getProductById);

export default router;