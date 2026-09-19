import { Prisma } from "../generated/prisma/client.js";
import type { Request,Response,NextFunction } from "express";
import ApiError from "../utils/ApiError.js";


export const errorHandler=(err:unknown,req:Request,res:Response,next:NextFunction)=>{

    if(err instanceof Prisma.PrismaClientKnownRequestError){
        if(err.code==="P2002"){
            res.status(409).json({
                success:false,
                message:err.message,
                err:[]
            });

        return;
        }

        if (err.code === "P2003") {
            res.status(409).json({
                success: false,
                message: "Referenced resource does not exist",
                errors: []
            });
            return;
        }
    }

    if(err instanceof(ApiError)){
        return res.status(err.statusCode).json({
            message:err.message,
            errors:err.errors,
            success:err.success
        })
    }

    return res.status(500).json({
        success:false,
        message:'Internal server error',
        err:[]
    })
}