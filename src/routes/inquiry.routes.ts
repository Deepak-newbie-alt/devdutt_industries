import express from "express";
import { claimInquirySchema, createInquirySchema, getInquiryParams, getInquiryQuerySchema, inquiryActivitySchema } from "../schemas/inquirySchema.js";
import { addNote, claimInquiry, closeInquiry, contactCustomer, createInquiry, getActivities, getInquiries, getInquiryById } from "../controllers/inquiry.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/",validator(createInquirySchema),createInquiry);
router.get("/",validator(getInquiryQuerySchema),getInquiries);
router.get("/:inquiryId",validator(getInquiryParams),getInquiryById);
router.patch("/:inquiryId/claim",validator(claimInquirySchema),claimInquiry);
router.post("/:inquiryId/contact",validator(claimInquirySchema),contactCustomer);
router.post("/:inquiryId/activities",validator(inquiryActivitySchema),addNote);
router.patch("/:inquiryId/close",validator(inquiryActivitySchema),closeInquiry);
router.get("/:inquiryId/activities",validator(inquiryActivitySchema),getActivities);

export default router;