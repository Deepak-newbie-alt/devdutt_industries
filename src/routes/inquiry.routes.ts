import express from "express";
import { claimInquirySchema, createInquirySchema, getInquiryParams, getInquiryQuerySchema, inquiryActivitySchema } from "../schemas/inquirySchema.js";
import { addNote, claimInquiry, closeInquiry, contactCustomer, createInquiry, getActivities, getInquiries, getInquiryById } from "../controllers/inquiry.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { auth, isSalesperson } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",validator(createInquirySchema),createInquiry);
router.get("/",validator(getInquiryQuerySchema),getInquiries);
router.get("/:inquiryId",validator(getInquiryParams),getInquiryById);
router.patch("/:inquiryId/claim",auth,isSalesperson,validator(claimInquirySchema),claimInquiry);
router.post("/:inquiryId/contact",auth,isSalesperson,validator(claimInquirySchema),contactCustomer);
router.post("/:inquiryId/activities",auth,isSalesperson,validator(inquiryActivitySchema),addNote);
router.patch("/:inquiryId/close",auth,isSalesperson,validator(inquiryActivitySchema),closeInquiry);
router.get("/:inquiryId/activities",auth,validator(inquiryActivitySchema),getActivities);

export default router;