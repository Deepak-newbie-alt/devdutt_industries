import type { Response } from "express";
import type { TrevisionIdParams } from "../schemas/quotationSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { OrderService } from "../services/order.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createOrder=catchAsync<ValidatedRequest<TrevisionIdParams>>(async(req,res:Response)=>{
    const data=await OrderService.createOrder(req.validated.params);

    res.status(201).json(
        new ApiResponse(201,"Order created successfully",data)
    )
    return;
})