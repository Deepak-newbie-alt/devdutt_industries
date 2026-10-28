import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductBrochureSchema } from "../schemas/productBrochureSchema.js";
import { createProductBrochure } from "../controllers/prouduct.brochures.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createProductBrochureSchema),createProductBrochure);

export default router;