import type { Response } from "express";
import type { TcreateQuotation, TeditQuotationRevision, TquotationIdParams, TrevisionIdParams, TsendQuotation } from "../schemas/quotationSchema.js";
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

export const editQuotation=catchAsync<ValidatedRequest<TeditQuotationRevision>>(async(req,res:Response)=>{
    const data=await QuotationService.editQuotationRevision(req.validated.params,req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Quotation edited successfully",data)
    )
    return;
})

export const getRevisions=catchAsync<ValidatedRequest<TquotationIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.getRevisions(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Revisions fetched successfully",data)
    )
    return;
})

export const requestRevision=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.requestRevision(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Revision requested successfully",data)
    )
    return;
})

export const createRevision=catchAsync<ValidatedRequest<TquotationIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.createRevision(req.validated.params);

    res.status(201).json(
        new ApiResponse(201,"Revision created successfully",data)
    )
    return;
})

export const acceptRevision=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.acceptRevision(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Revision accepted, Inquiry closed",data)
    )
    return;
})

export const rejectRevision=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.rejectRevision(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Revision rejected, Inquiry closed",data)
    )
    return;
})