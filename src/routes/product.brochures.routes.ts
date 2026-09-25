import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductBrochureSchema } from "../schemas/productBrochureSchema.js";
import { createProductBrochure } from "../controllers/prouduct.brochures.controllers.js";
const router=express.Router();

router.post("/",validator(createProductBrochureSchema),createProductBrochure);

export default router;