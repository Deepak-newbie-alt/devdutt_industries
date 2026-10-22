import { orderActivityAddNoteSchema, orderStatusTransitionSchema } from '../schemas/orderSchema.js';
import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { changeOrderStatus, createOrder, viewOrders, viewOrdersById,addNote, viewActivities } from "../controllers/orders.controllers.js";
import { orderIdParamsSchema, viewOrdersQuerySchema, yourOrderBodySchema } from "../schemas/orderSchema.js";
import { auth, isAdmin, isSalesperson } from '../middlewares/authMiddleware.js';
const router=express.Router();

router.get("/",auth,isAdmin,validator(viewOrdersQuerySchema),viewOrders);
router.get("/:orderId",auth,validator(orderIdParamsSchema),viewOrdersById);
router.post("/",auth,isSalesperson,validator(yourOrderBodySchema),createOrder);
router.patch("/:orderId/status",auth,isSalesperson,validator(orderStatusTransitionSchema),changeOrderStatus);
router.post("/:orderId/add-note",auth,isSalesperson,validator(orderActivityAddNoteSchema),addNote);
router.get("/:orderId/activities",auth,isSalesperson,validator(orderIdParamsSchema),viewActivities);

export default router;