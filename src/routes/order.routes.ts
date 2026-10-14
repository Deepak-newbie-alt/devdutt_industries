import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { revisionIdParamsSchema } from "../schemas/quotationSchema.js";
import { createOrder } from "../controllers/orders.controllers.js";
const router=express.Router();

router.post("/:revisionId",validator(revisionIdParamsSchema),createOrder);

export default router;