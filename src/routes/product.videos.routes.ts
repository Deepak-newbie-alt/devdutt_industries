import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductVideoSchema } from "../schemas/productVideosSchema.js";
import { createProductVideo } from "../controllers/product.videos.controllers.js";
const router=express.Router();

router.post("/",validator(createProductVideoSchema),createProductVideo);

export default router;