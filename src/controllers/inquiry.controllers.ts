import type { Response } from 'express';
import { catchAsync } from "../utils/catchAsync.js";
import type { ValidatedRequest } from '../types/ValidatedRequest.js';
import { InquiryService } from '../services/inquiry.services.js';
import type { TcreateInquiryInput, TgetInquiryParams, TgetInquiryQuery } from '../schemas/inquirySchema.js';
import ApiResponse from '../utils/ApiResponse.js';


export const createInquiry=catchAsync<ValidatedRequest<TcreateInquiryInput>>(async(req,res:Response)=>{
    const data=await InquiryService.createInquiry(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Inquiry created successfully",data)
    )
    return;
})

export const getInquiries=catchAsync<ValidatedRequest<TgetInquiryQuery>>(async(req,res:Response)=>{
    const data=await InquiryService.getInquiries(req.validated.query);

    res.status(200).json(
        new ApiResponse(200,"Inquiries fetched successfully",data)
    )

    return;
})

export const getInquiryById=catchAsync<ValidatedRequest<TgetInquiryParams>>(async(req,res:Response)=>{
    const data=await InquiryService.getInquiryById(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Inquiry fetched successfully",data)
    )
    return;
})