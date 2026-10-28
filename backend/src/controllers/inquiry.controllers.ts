import type { Response } from 'express';
import { catchAsync } from "../utils/catchAsync.js";
import type { ValidatedRequest } from '../types/ValidatedRequest.js';
import { InquiryService } from '../services/inquiry.services.js';
import type { TclaimInquiry, TcloseInquiry, TclosureRequest, TcreateInquiryInput, TcustomerInquiryHistory, TgetInquiryActivity, TgetInquiryParams, TgetInquiryQuery, TinquiryActivity } from '../schemas/inquirySchema.js';
import ApiResponse from '../utils/ApiResponse.js';


export const createInquiry=catchAsync<ValidatedRequest<TcreateInquiryInput>>(async(req,res:Response)=>{
    const data=await InquiryService.createInquiry(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Inquiry created successfully",data)
    )
    return;
})

export const getCustomerInquiryHistory=catchAsync<ValidatedRequest<TcustomerInquiryHistory>>(async(req,res:Response)=>{
    const data=await InquiryService.getCustomerInquiryHistory(req.validated.body);

    res.status(200).json(
        new ApiResponse(200,"Inquiries fetched successfully",data)
    )
    return;
})

export const getInquiries=catchAsync<ValidatedRequest<TgetInquiryQuery>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await InquiryService.getInquiries(req.validated.query,actor);

    res.status(200).json(
        new ApiResponse(200,"Inquiries fetched successfully",data)
    )

    return;
})

export const getInquiryById=catchAsync<ValidatedRequest<TgetInquiryParams>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await InquiryService.getInquiryById(req.validated.params,actor);

    res.status(200).json(
        new ApiResponse(200,"Inquiry fetched successfully",data)
    )
    return;
})

export const claimInquiry=catchAsync<ValidatedRequest<TclaimInquiry>>(async(req,res:Response)=>{
    const data=await InquiryService.claimInquiry(req.validated.params,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,'Inquiry claimed successfully',data)
    )
    return;
})

export const contactCustomer=catchAsync<ValidatedRequest<TinquiryActivity>>(async(req,res:Response)=>{
    const data=await InquiryService.contactCustomer(req.validated.params,req.validated.body,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Customer contacted",data)
    )

    return;
})

export const addNote=catchAsync<ValidatedRequest<TinquiryActivity>>(async(req,res:Response)=>{
    const data=await InquiryService.addNote(req.validated.params,req.validated.body,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Added a note",data)
    )
    return;
})

export const closeInquiry=catchAsync<ValidatedRequest<TcloseInquiry>>(async(req,res:Response)=>{
    const data=await InquiryService.closeInquiry(req.validated.params,req.validated.body,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Inquiry closed",data)
    )
    return;
})

export const requestClosure=catchAsync<ValidatedRequest<TclosureRequest>>(async(req,res:Response)=>{
    const data=await InquiryService.requestClosure(req.validated.params,req.validated.body,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Closure requested; waiting for an admin's review",data)
    )
    return;
})

export const getActivities=catchAsync<ValidatedRequest<TgetInquiryActivity>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await InquiryService.getActivities(req.validated.params,actor);

    res.status(200).json(
        new ApiResponse(200,"Activity history fetched successfully",data)
    )
    return;
})