import { type Request,type Response,type NextFunction } from "express"
import type { ZodType } from "zod"
import ApiError from "../utils/ApiError.js"

export const validator=(schema:ZodType)=>(req:Request,res:Response,next:NextFunction)=>{
    const result=schema.safeParse(req.body)

    if (!result.success) {
        const errors=result.error.issues.map(err=>({
            field:err.path[0],
            message:err.message
        }))

        throw new ApiError(400,"Validation Failed",errors);
    }

    req.body=result.data
    next()
}