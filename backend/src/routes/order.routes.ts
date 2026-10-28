import { orderActivityAddNoteSchema, orderStatusTransitionSchema } from '../schemas/orderSchema.js';
import express from "express";
import { validator } from "../middlewares/validationMiddleware.js";
import { changeOrderStatus, createOrder, viewOrders, viewOrdersById,addNote, viewActivities } from "../controllers/orders.controllers.js";
import { orderIdParamsSchema, viewOrdersQuerySchema, yourOrderBodySchema } from "../schemas/orderSchema.js";
import { auth, isSalesperson } from '../middlewares/authMiddleware.js';
const router=express.Router();

// Admins see every order; a salesperson sees orders from their own quotations.
router.get("/",auth,validator(viewOrdersQuerySchema),viewOrders);
router.get("/:orderId",auth,validator(orderIdParamsSchema),viewOrdersById);
router.post("/",auth,isSalesperson,validator(yourOrderBodySchema),createOrder);
router.patch("/:orderId/status",auth,isSalesperson,validator(orderStatusTransitionSchema),changeOrderStatus);
router.post("/:orderId/add-note",auth,isSalesperson,validator(orderActivityAddNoteSchema),addNote);
// Admins may read any order's history; a salesperson only their own (checked in the service).
router.get("/:orderId/activities",auth,validator(orderIdParamsSchema),viewActivities);

export default router;