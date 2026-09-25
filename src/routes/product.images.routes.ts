import express from "express"
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductImageSchema } from "../schemas/productImagesSchema.js";
import { createProductImage } from "../controllers/product.images.controllers.js";
const router=express.Router();

router.post("/",validator(createProductImageSchema),createProductImage);

export default router;