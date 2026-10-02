import express from "express";
import { createInquirySchema, getInquiryParams, getInquiryQuerySchema } from "../schemas/inquirySchema.js";
import { createInquiry, getInquiries, getInquiryById } from "../controllers/inquiry.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/",validator(createInquirySchema),createInquiry);
router.get("/",validator(getInquiryQuerySchema),getInquiries);
router.get("/:inquiryId",validator(getInquiryParams),getInquiryById);

export default router;