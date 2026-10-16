import { orderActivityAddNoteSchema, orderStatusTransitionSchema } from '../schemas/orderSchema.js';
import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { changeOrderStatus, createOrder, viewOrders, viewOrdersById,addNote, viewActivities } from "../controllers/orders.controllers.js";
import { orderIdParamsSchema, viewOrdersQuerySchema, yourOrderBodySchema } from "../schemas/orderSchema.js";
const router=express.Router();

router.get("/",validator(viewOrdersQuerySchema),viewOrders);
router.get("/:orderId",validator(orderIdParamsSchema),viewOrdersById);
router.post("/",validator(yourOrderBodySchema),createOrder);
router.patch("/:orderId/status",validator(orderStatusTransitionSchema),changeOrderStatus);
router.post("/:orderId/add-note",validator(orderActivityAddNoteSchema),addNote);
router.get("/:orderId/activities",validator(orderIdParamsSchema),viewActivities);

export default router;