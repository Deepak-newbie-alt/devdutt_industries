import express from "express";
import { claimInquirySchema, closeInquirySchema, closureRequestSchema, createInquirySchema, customerInquiryHistorySchema, getInquiryActivitySchema, getInquiryParams, getInquiryQuerySchema, inquiryActivitySchema } from "../schemas/inquirySchema.js";
import { addNote, claimInquiry, closeInquiry, contactCustomer, createInquiry, getActivities, getCustomerInquiryHistory, getInquiries, getInquiryById, requestClosure } from "../controllers/inquiry.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { auth, isSalesperson } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/",validator(createInquirySchema),createInquiry);
// Customer-facing: phone and code travel in the body, never the URL.
router.post("/customer/history",validator(customerInquiryHistorySchema),getCustomerInquiryHistory);
router.get("/",auth,validator(getInquiryQuerySchema),getInquiries);
router.get("/:inquiryId",auth,validator(getInquiryParams),getInquiryById);
router.patch("/:inquiryId/claim",auth,isSalesperson,validator(claimInquirySchema),claimInquiry);
router.post("/:inquiryId/contact",auth,isSalesperson,validator(inquiryActivitySchema),contactCustomer);
router.post("/:inquiryId/activities",auth,isSalesperson,validator(inquiryActivitySchema),addNote);
router.patch("/:inquiryId/close",auth,isSalesperson,validator(closeInquirySchema),closeInquiry);
router.post("/:inquiryId/closure-requests",auth,isSalesperson,validator(closureRequestSchema),requestClosure);
router.get("/:inquiryId/activities",auth,validator(getInquiryActivitySchema),getActivities);

export default router;