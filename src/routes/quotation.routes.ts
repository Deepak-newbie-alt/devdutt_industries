import express from "express";
import { createQuotationSchema, createRevisionSchema, editQuotationSchema, getQuotationRevisionParamsSchema, sendQuotationSchema } from "../schemas/quotationSchema.js";
import { acceptRevision, createQuotation, createRevision, editQuotation, getRevisions, rejectRevision, requestRevision, sendQuotation } from "../controllers/quotation.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/:inquiryId",validator(createQuotationSchema),createQuotation);
router.put("/:revisionId",validator(editQuotationSchema),editQuotation);
router.get("/:quotationId",validator(getQuotationRevisionParamsSchema),getRevisions);
router.post("/:quotationId/revisions",validator(createRevisionSchema),createRevision);
router.patch("/revisions/:revisionId/request-revision",validator(editQuotationSchema),requestRevision);
router.patch("/revisions/:revisionId/accept",validator(editQuotationSchema),acceptRevision);
router.patch("/revisions/:revisionId/reject",validator(editQuotationSchema),rejectRevision);
router.patch("/revisions/:revisionId/send-quotation",validator(sendQuotationSchema),sendQuotation);

export default router;