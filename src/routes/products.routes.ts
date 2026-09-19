import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,getProducts } from "../controllers/products.controllers.js";
import { createProductSchema, getProductsQuerySchema } from '../schemas/productSchema.js';

router.post("/",validator(createProductSchema),createProduct);
router.get("/",validator(getProductsQuerySchema),getProducts);

export default router;