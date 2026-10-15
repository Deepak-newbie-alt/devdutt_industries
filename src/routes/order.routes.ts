import { orderActivityAddNoteSchema, orderStatusTransitionSchema } from '../schemas/orderSchema.js';
import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { changeOrderStatus, createOrder, viewOrders, viewOrdersById } from "../controllers/orders.controllers.js";
import { orderIdParamsSchema, viewOrdersQuerySchema, yourOrderBodySchema } from "../schemas/orderSchema.js";
import { addNote } from '../controllers/inquiry.controllers.js';
const router=express.Router();

router.get("/",validator(viewOrdersQuerySchema),viewOrders);
router.get("/:orderId",validator(orderIdParamsSchema),viewOrdersById);
router.post("/",validator(yourOrderBodySchema),createOrder);
router.patch("/:orderId/status",validator(orderStatusTransitionSchema),changeOrderStatus);
router.post("/:orderId/add-note",validator(orderActivityAddNoteSchema),addNote);

export default router;