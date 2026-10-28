import express from 'express';
const router=express.Router();

import { createCategory,getCategories, getCategoriesForAdmin, getCategoryById, getCategoryByIdForAdmin, updateCategory } from '../controllers/categories.controllers.js';
import { validator } from '../middlewares/validationMiddleware.js';
import { createCategorySchema, getAdminCategoriesQuerySchema, getCategoryByIdParams, getCategoryQuerySchema, updateCategorySchema } from '../schemas/categorySchema.js';
import { auth, isAdmin } from '../middlewares/authMiddleware.js';

router.post("/",auth,isAdmin,validator(createCategorySchema),createCategory);
router.get("/",validator(getCategoryQuerySchema),getCategories);
// Admin views list every status; declared before "/:categoryId".
router.get("/admin",auth,isAdmin,validator(getAdminCategoriesQuerySchema),getCategoriesForAdmin);
router.get("/admin/:categoryId",auth,isAdmin,validator(getCategoryByIdParams),getCategoryByIdForAdmin);
router.get("/:categoryId",validator(getCategoryByIdParams),getCategoryById);
router.patch("/:categoryId",auth,isAdmin,validator(updateCategorySchema),updateCategory);

export default router;