import express from 'express';
const router=express.Router();

import { createCategory,getCategories, getCategoryById, updateCategory } from '../controllers/categories.controllers.js';
import { validator } from '../middlewares/validationMiddleware.js';
import { createCategorySchema, getCategoryByIdParams, getCategoryQuerySchema, updateCategorySchema } from '../schemas/categorySchema.js';

router.post("/",validator(createCategorySchema),createCategory);
router.get("/",validator(getCategoryQuerySchema),getCategories);
router.get("/:categoryId",validator(getCategoryByIdParams),getCategoryById);
router.patch("/:categoryId",validator(updateCategorySchema),updateCategory);

export default router;