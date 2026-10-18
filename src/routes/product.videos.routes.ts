import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductVideoSchema } from "../schemas/productVideosSchema.js";
import { createProductVideo } from "../controllers/product.videos.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createProductVideoSchema),createProductVideo);

export default router;