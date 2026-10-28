import express from "express"
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductImageSchema, productImageIdParamsSchema } from "../schemas/productImagesSchema.js";
import { createProductImage, deleteProductImage } from "../controllers/product.images.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createProductImageSchema),createProductImage);
router.delete("/:imageId",auth,isAdmin,validator(productImageIdParamsSchema),deleteProductImage);

export default router;