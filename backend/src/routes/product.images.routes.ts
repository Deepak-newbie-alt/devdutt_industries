import express from "express"
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductImageSchema } from "../schemas/productImagesSchema.js";
import { createProductImage } from "../controllers/product.images.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createProductImageSchema),createProductImage);

export default router;