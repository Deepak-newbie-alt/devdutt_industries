import express from 'express';
const router=express.Router();

import { createCategory,getCategories } from '../controllers/categories.controllers.js';
import { validator } from '../middlewares/validationMiddleware.js';
import { createCategorySchema } from '../schemas/categorySchema.js';

router.post("/",validator(createCategorySchema),createCategory);
router.get("/",getCategories);

export default router;