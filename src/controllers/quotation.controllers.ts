import type { Response } from "express";
import type { TcreateQuotation, TsendQuotation } from "../schemas/quotationSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { QuotationService } from "../services/quotation.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createQuotation=catchAsync<ValidatedRequest<TcreateQuotation>>(async(req,res:Response)=>{
    const data=await QuotationService.createQuotation(req.validated.params,req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Quotationcreated successfully",data)
    )
    return;
})

export const sendQuotation=catchAsync<ValidatedRequest<TsendQuotation>>(async(req,res:Response)=>{
    const data=await QuotationService.sendQuotation(req.validated.params,req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Quotation sent successfully",data)
    )
    return;
})