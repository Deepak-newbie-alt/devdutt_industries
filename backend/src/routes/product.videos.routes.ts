import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { createProductVideoSchema, productVideoIdParamsSchema } from "../schemas/productVideosSchema.js";
import { createProductVideo, deleteProductVideo } from "../controllers/product.videos.controllers.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",auth,isAdmin,validator(createProductVideoSchema),createProductVideo);
router.delete("/:videoId",auth,isAdmin,validator(productVideoIdParamsSchema),deleteProductVideo);

export default router;