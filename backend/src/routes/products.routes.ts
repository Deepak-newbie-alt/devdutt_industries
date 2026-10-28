import { validator } from '../middlewares/validationMiddleware.js';
import express from "express";
const router=express.Router();

import { createProduct,deleteProductById,getProductById,getProductByIdForAdmin,getProducts,getProductsForAdmin, updateProduct } from "../controllers/products.controllers.js";
import { createProductSchema, getAdminProductsQuerySchema, getProductByIdParamsSchema, getProductsQuerySchema, updateProductByIdSchema } from '../schemas/productSchema.js';
import { auth, isAdmin } from '../middlewares/authMiddleware.js';

router.post("/",auth,isAdmin,validator(createProductSchema),createProduct);
router.get("/",validator(getProductsQuerySchema),getProducts);
// Admin views list every status; declared before "/:productId".
router.get("/admin",auth,isAdmin,validator(getAdminProductsQuerySchema),getProductsForAdmin);
router.get("/admin/:productId",auth,isAdmin,validator(getProductByIdParamsSchema),getProductByIdForAdmin);
router.get("/:productId",validator(getProductByIdParamsSchema),getProductById);
router.patch("/:productId",auth,isAdmin,validator(updateProductByIdSchema),updateProduct);
router.delete("/:productId",auth,isAdmin,validator(getProductByIdParamsSchema),deleteProductById);

export default router;