import { orderStatusTransitionSchema } from '../schemas/orderSchema.js';
import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { changeOrderStatus, createOrder, viewOrders, viewOrdersById } from "../controllers/orders.controllers.js";
import { orderIdParamsSchema, viewOrdersQuerySchema, yourOrderBodySchema } from "../schemas/orderSchema.js";
const router=express.Router();

router.get("/",validator(viewOrdersQuerySchema),viewOrders);
router.get("/:orderId",validator(orderIdParamsSchema),viewOrdersById);
router.post("/:quotationRevisionId",validator(yourOrderBodySchema),createOrder);
router.patch("/:orderId",validator(orderStatusTransitionSchema),changeOrderStatus);

export default router;