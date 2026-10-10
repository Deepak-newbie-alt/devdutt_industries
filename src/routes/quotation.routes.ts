import express from "express";
import { createQuotationSchema, editQuotationSchema, getQuotationRevisionParamsSchema, sendQuotationSchema } from "../schemas/quotationSchema.js";
import { createQuotation, editQuotation, getRevisions, sendQuotation } from "../controllers/quotation.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/:inquiryId",validator(createQuotationSchema),createQuotation);
router.patch("/:revisionId",validator(sendQuotationSchema),sendQuotation);
router.put("/:revisionId",validator(editQuotationSchema),editQuotation);
router.get("/:quotationId",validator(getQuotationRevisionParamsSchema),getRevisions);

export default router;