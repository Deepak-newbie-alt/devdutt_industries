import express from "express";
import { createQuotationSchema, editQuotationSchema, quotationIdParamsSchema, revisionIdParamsSchema, sendQuotationSchema } from "../schemas/quotationSchema.js";
import { acceptRevision, createQuotation, createRevision, editQuotation, getRevisions, rejectRevision, requestRevision, sendQuotation } from "../controllers/quotation.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/:inquiryId",validator(createQuotationSchema),createQuotation);
router.put("/:revisionId",validator(editQuotationSchema),editQuotation);
router.get("/:quotationId",validator(quotationIdParamsSchema),getRevisions);
router.post("/:quotationId/revisions",validator(quotationIdParamsSchema),createRevision);
router.patch("/revisions/:revisionId/request-revision",validator(revisionIdParamsSchema),requestRevision);
router.patch("/revisions/:revisionId/accept",validator(revisionIdParamsSchema),acceptRevision);
router.patch("/revisions/:revisionId/reject",validator(revisionIdParamsSchema),rejectRevision);
router.patch("/revisions/:revisionId/send-quotation",validator(sendQuotationSchema),sendQuotation);

export default router;