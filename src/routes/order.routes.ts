import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { revisionIdParamsSchema } from "../schemas/quotationSchema.js";
import { createOrder, viewOrders, viewOrdersById } from "../controllers/orders.controllers.js";
import { orderIdParamsSchema, viewOrdersQuerySchema } from "../schemas/orderSchema.js";
const router=express.Router();

router.get("/",validator(viewOrdersQuerySchema),viewOrders);
router.get("/:orderId",validator(orderIdParamsSchema),viewOrdersById);
router.post("/:revisionId",validator(revisionIdParamsSchema),createOrder);

export default router;