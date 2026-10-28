import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductBrochureSchema, productBrochureIdParamsSchema } from "../schemas/productBrochureSchema.js";
import { createProductBrochure, deleteProductBrochure } from "../controllers/prouduct.brochures.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createProductBrochureSchema),createProductBrochure);
router.delete("/:brochureId",auth,isAdmin,validator(productBrochureIdParamsSchema),deleteProductBrochure);

export default router;