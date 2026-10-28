import express from "express";
import { createQuotationSchema, customerQuotationLookupSchema, customerRevisionResponseSchema, editQuotationSchema, quotationIdParamsSchema, revisionIdParamsSchema, sendQuotationSchema } from "../schemas/quotationSchema.js";
import { acceptRevision, createQuotation, createRevision, editQuotation, generatePdf, getCustomerQuotation, getIssuedDocument, getRevisions, reissueCustomerLink, rejectRevision, requestRevision, sendQuotation } from "../controllers/quotation.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { auth, isSalesperson } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/:inquiryId",auth,isSalesperson,validator(createQuotationSchema),createQuotation);
router.put("/:revisionId",auth,isSalesperson,validator(editQuotationSchema),editQuotation);
router.get("/:quotationId",auth,validator(quotationIdParamsSchema),getRevisions);
router.post("/:quotationId/revisions",auth,isSalesperson,validator(quotationIdParamsSchema),createRevision);
router.patch("/revisions/:revisionId/request-revision",validator(customerRevisionResponseSchema),requestRevision);
router.patch("/revisions/:revisionId/accept",validator(customerRevisionResponseSchema),acceptRevision);
router.patch("/revisions/:revisionId/reject",validator(customerRevisionResponseSchema),rejectRevision);
router.patch("/revisions/:revisionId/send-quotation",auth,isSalesperson,validator(sendQuotationSchema),sendQuotation);
router.post("/revisions/:revisionId",auth,isSalesperson,validator(revisionIdParamsSchema),generatePdf);
router.get("/revisions/:revisionId/document",auth,validator(revisionIdParamsSchema),getIssuedDocument);
router.post("/revisions/:revisionId/customer-link",auth,isSalesperson,validator(revisionIdParamsSchema),reissueCustomerLink);
// Customer-facing: the token travels in the body, never the URL.
router.post("/customer/lookup",validator(customerQuotationLookupSchema),getCustomerQuotation);

export default router;