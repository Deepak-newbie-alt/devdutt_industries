import type { Response } from "express";
import type { TcreateQuotation, TcustomerQuotationLookup, TcustomerRevisionResponse, TeditQuotationRevision, TquotationIdParams, TrevisionIdParams, TsendQuotation } from "../schemas/quotationSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { QuotationService } from "../services/quotation.services.js";
import ApiResponse from "../utils/ApiResponse.js";
import { quotationPdfService } from "../services/generate.pdf.services.js";


export const createQuotation=catchAsync<ValidatedRequest<TcreateQuotation>>(async(req,res:Response)=>{
    const data=await QuotationService.createQuotation(req.validated.params,req.validated.body,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Quotation created successfully",data)
    )
    return;
})

export const sendQuotation=catchAsync<ValidatedRequest<TsendQuotation>>(async(req,res:Response)=>{
    const data=await QuotationService.sendQuotation(req.validated.params,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Quotation sent successfully",data)
    )
    return;
})

export const editQuotation=catchAsync<ValidatedRequest<TeditQuotationRevision>>(async(req,res:Response)=>{
    const data=await QuotationService.editQuotationRevision(req.validated.params,req.validated.body,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Quotation edited successfully",data)
    )
    return;
})

export const getRevisions=catchAsync<ValidatedRequest<TquotationIdParams>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await QuotationService.getRevisions(req.validated.params,actor);

    res.status(200).json(
        new ApiResponse(200,"Revisions fetched successfully",data)
    )
    return;
})

export const requestRevision=catchAsync<ValidatedRequest<TcustomerRevisionResponse>>(async(req,res:Response)=>{
    const data=await QuotationService.requestRevision(req.validated.params,req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Revision requested successfully",data)
    )
    return;
})

export const createRevision=catchAsync<ValidatedRequest<TquotationIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.createRevision(req.validated.params,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Revision created successfully",data)
    )
    return;
})

export const acceptRevision=catchAsync<ValidatedRequest<TcustomerRevisionResponse>>(async(req,res:Response)=>{
    const data=await QuotationService.acceptRevision(req.validated.params,req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Revision accepted, Inquiry closed",data)
    )
    return;
})

export const rejectRevision=catchAsync<ValidatedRequest<TcustomerRevisionResponse>>(async(req,res:Response)=>{
    const data=await QuotationService.rejectRevision(req.validated.params,req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Revision rejected, Inquiry closed",data)
    )
    return;
})

export const generatePdf=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{

    const {buffer,fileName}=await quotationPdfService.generate(req.validated.params,req.user!.id);

    // Draft previews are streamed and never cached or stored.
    res.status(200).set({
        "Content-Type":"application/pdf",
        "Content-Disposition":`inline; filename="${fileName}"`,
        "Content-Length":String(buffer.length),
        "Cache-Control":"no-store"
    }).send(buffer);
    return;
})

export const getIssuedDocument=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const document=await QuotationService.getIssuedDocument(req.validated.params,actor);

    // Issued documents never change, so the hash is a stable ETag.
    res.status(200).set({
        "Content-Type":"application/pdf",
        "Content-Disposition":`inline; filename="${document.fileName}"`,
        "Content-Length":String(document.sizeBytes),
        "ETag":`"${document.sha256}"`,
        "Cache-Control":"private, max-age=31536000, immutable"
    }).send(Buffer.from(document.content));
    return;
})

export const reissueCustomerLink=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{
    const data=await QuotationService.reissueCustomerLink(req.validated.params,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Customer link issued; the previous link no longer works",data)
    )
    return;
})

export const getCustomerQuotation=catchAsync<ValidatedRequest<TcustomerQuotationLookup>>(async(req,res:Response)=>{
    const data=await QuotationService.getCustomerQuotation(req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Quotation fetched successfully",data)
    )
    return;
})
