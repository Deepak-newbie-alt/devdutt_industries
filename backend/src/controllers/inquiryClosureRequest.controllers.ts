import type { Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import ApiResponse from "../utils/ApiResponse.js";
import { InquiryClosureRequestService } from "../services/inquiryClosureRequest.services.js";
import type { TlistClosureRequestsQuery, TreviewClosureRequest } from "../schemas/inquiryClosureRequestSchema.js";

export const listClosureRequests=catchAsync<ValidatedRequest<TlistClosureRequestsQuery>>(async(req,res:Response)=>{
    const data=await InquiryClosureRequestService.list(req.validated.query);

    res.status(200).json(
        new ApiResponse(200,"Closure requests fetched successfully",data)
    )
    return;
})

export const approveClosureRequest=catchAsync<ValidatedRequest<TreviewClosureRequest>>(async(req,res:Response)=>{
    const data=await InquiryClosureRequestService.approve(req.validated.params,req.validated.body,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Closure request approved",data)
    )
    return;
})

export const rejectClosureRequest=catchAsync<ValidatedRequest<TreviewClosureRequest>>(async(req,res:Response)=>{
    const data=await InquiryClosureRequestService.reject(req.validated.params,req.validated.body,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Closure request rejected",data)
    )
    return;
})
