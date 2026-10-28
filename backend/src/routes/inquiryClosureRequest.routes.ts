import express from "express";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { listClosureRequestsQuerySchema, reviewClosureRequestSchema } from "../schemas/inquiryClosureRequestSchema.js";
import { approveClosureRequest, listClosureRequests, rejectClosureRequest } from "../controllers/inquiryClosureRequest.controllers.js";
const router=express.Router();

// Admins review the OTHER closures salespeople request (POST /inquiries/:inquiryId/closure-requests).
router.get("/",auth,isAdmin,validator(listClosureRequestsQuerySchema),listClosureRequests);
router.patch("/:requestId/approve",auth,isAdmin,validator(reviewClosureRequestSchema),approveClosureRequest);
router.patch("/:requestId/reject",auth,isAdmin,validator(reviewClosureRequestSchema),rejectClosureRequest);

export default router;
