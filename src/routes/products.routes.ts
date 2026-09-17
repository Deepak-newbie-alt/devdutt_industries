import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,getProducts } from "../controllers/products.controllers.js";
import { createProductSchema } from '../schemas/productSchema.js';

router.post("/",validator(createProductSchema),createProduct);
router.get("/",getProducts);

export default router;