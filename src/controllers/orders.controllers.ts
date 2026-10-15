import type { Response } from "express";
import type { TrevisionIdBody } from "../schemas/quotationSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { OrderService } from "../services/order.services.js";
import ApiResponse from "../utils/ApiResponse.js";
import type { TorderIdParams, TviewOrdersQuery } from "../schemas/orderSchema.js";


export const createOrder=catchAsync<ValidatedRequest<TrevisionIdBody>>(async(req,res:Response)=>{
    const data=await OrderService.createOrder(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Order created successfully",data)
    )
    return;
})

export const viewOrders=catchAsync<ValidatedRequest<TviewOrdersQuery>>(async(req,res:Response)=>{
    const data=await OrderService.viewOrders(req.validated.query);

    res.status(200).json(
        new ApiResponse(200,"Orders fetched successfully",data)
    )
    return;
})

export const viewOrdersById=catchAsync<ValidatedRequest<TorderIdParams>>(async(req,res:Response)=>{
    const data=await OrderService.viewOrdersById(req.validated.params);

    res.status(200).json(
        new ApiResponse(200,"Order fetched by id",data)
    )
    return;
})