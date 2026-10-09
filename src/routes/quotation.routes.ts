import express from "express";
import { createQuotationSchema, sendQuotationSchema } from "../schemas/quotationSchema.js";
import { createQuotation, sendQuotation } from "../controllers/quotation.controllers.js";
import { validator } from "../middlewares/validationMiddleware.js";
const router=express.Router();

router.post("/:inquiryId",validator(createQuotationSchema),createQuotation);
router.patch("/:revisionId",validator(sendQuotationSchema),sendQuotation);

export default router;