import type { Response } from "express";
import type { TcreateUserInput } from "../schemas/userSchema.js";
import type { ValidatedRequest } from "../types/ValidatedRequest.js";
import { catchAsync } from "../utils/catchAsync.js";
import { UserService } from "../services/user.services.js";
import ApiResponse from "../utils/ApiResponse.js";


export const createSalesman=catchAsync<ValidatedRequest<TcreateUserInput>>(async(req,res:Response)=>{
    const data=await UserService.createSalesman(req.validated.body);

    res.status(201).json(
        new ApiResponse(201,"Salesman created successfully",data)
    )
    return;
})