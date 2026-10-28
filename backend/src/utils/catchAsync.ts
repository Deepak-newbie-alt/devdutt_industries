import type { Request,Response,NextFunction,RequestHandler } from "express"

type AsyncHandler<T extends Request> =(
    req:T,
    res:Response,
    next:NextFunction
)=>Promise<void>;


export const catchAsync=<T extends Request>(fn:AsyncHandler<T>):RequestHandler=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        Promise.resolve(fn(req as T,res,next))
        .catch(next)
    }
}