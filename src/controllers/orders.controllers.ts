import type { Response } from "express";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { OrderService } from "../services/order.services.js";
import ApiResponse from "../utils/ApiResponse.js";
import type { TorderActivityAddNote, TorderIdParams, TorderStatusTransition, TviewOrdersQuery, TyourOrderBody } from "../schemas/orderSchema.js";


export const createOrder=catchAsync<ValidatedRequest<TyourOrderBody>>(async(req,res:Response)=>{
    const data=await OrderService.createOrder(req.validated.body,req.user!.id);

    res.status(201).json(
        new ApiResponse(201,"Order created successfully",data)
    )
    return;
})

export const viewOrders=catchAsync<ValidatedRequest<TviewOrdersQuery>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await OrderService.viewOrders(req.validated.query,actor);

    res.status(200).json(
        new ApiResponse(200,"Orders fetched successfully",data)
    )
    return;
})

export const viewOrdersById=catchAsync<ValidatedRequest<TorderIdParams>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await OrderService.viewOrdersById(req.validated.params,actor);

    res.status(200).json(
        new ApiResponse(200,"Order fetched by id",data)
    )
    return;
})

export const changeOrderStatus=catchAsync<ValidatedRequest<TorderStatusTransition>>(async(req,res:Response)=>{
    const data=await OrderService.changeOrderStatus(req.validated.params,req.validated.body,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Order status changed successfully",data)
    )
    return;
})

export const addNote=catchAsync<ValidatedRequest<TorderActivityAddNote>>(async(req,res:Response)=>{
    const data=await OrderService.addNote(req.validated.params,req.validated.body,req.user!.id);

    res.status(200).json(
        new ApiResponse(200,"Note added",data)
    )
    return;
})

export const viewActivities=catchAsync<ValidatedRequest<TorderIdParams>>(async(req,res:Response)=>{
    const actor:Actor={
        id:req.user!.id,
        role:req.user!.role
    }
    const data=await OrderService.viewActivities(req.validated.params,actor);

    res.status(200).json(
        new ApiResponse(200,"Order activity lifecycle",data)
    )
    return;
})