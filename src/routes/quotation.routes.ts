import express from "express";
import { createQuotationSchema, editQuotationSchema, quotationIdParamsSchema, revisionIdParamsSchema, sendQuotationSchema } from "../schemas/quotationSchema.js";
import { acceptRevision, createQuotation, createRevision, editQuotation, getRevisions, rejectRevision, requestRevision, sendQuotation } from "../controllers/quotation.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
import { auth, isSalesperson } from "../middlewares/authMiddleware.js";
const router=express.Router();

router.post("/:inquiryId",auth,isSalesperson,validator(createQuotationSchema),createQuotation);
router.put("/:revisionId",auth,isSalesperson,validator(editQuotationSchema),editQuotation);
router.get("/:quotationId",auth,validator(quotationIdParamsSchema),getRevisions);
router.post("/:quotationId/revisions",auth,isSalesperson,validator(quotationIdParamsSchema),createRevision);
router.patch("/revisions/:revisionId/request-revision",validator(revisionIdParamsSchema),requestRevision);
router.patch("/revisions/:revisionId/accept",validator(revisionIdParamsSchema),acceptRevision);
router.patch("/revisions/:revisionId/reject",validator(revisionIdParamsSchema),rejectRevision);
router.patch("/revisions/:revisionId/send-quotation",auth,isSalesperson,validator(sendQuotationSchema),sendQuotation);

export default router;