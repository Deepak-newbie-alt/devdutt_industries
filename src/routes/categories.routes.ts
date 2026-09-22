import express from 'express';
const router=express.Router();

import { createCategory,getCategories, getCategoryById } from '../controllers/categories.controllers.js';
import { validator } from '../middlewares/validationMiddleware.js';
import { createCategorySchema, getCategoryByIdParams, getCategoryQuerySchema } from '../schemas/categorySchema.js';

router.post("/",validator(createCategorySchema),createCategory);
router.get("/",validator(getCategoryQuerySchema),getCategories);
router.get("/:categoryId",validator(getCategoryByIdParams),getCategoryById);

export default router;