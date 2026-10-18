import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import ApiError from "../utils/ApiError.js";
import prisma from "../lib/prisma.js";

export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    throw new ApiError(401, "Not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found in database");
  }

  req.user = {
        id: user.id,
        clerkId: userId,
    };

  next();
};

export const isSalesperson=async(req:Request,res:Response,next:NextFunction)=>{
    const userId=req.user?.id;

    if(!userId){
        throw new ApiError(401,"Please login to access this endpoint");
    }

    const user=await prisma.user.findUnique({
        where:{
            id:userId
        }
    })

    if(!user){
        throw new ApiError(404,"User not found");
    }

    if(user.role!=="SALESPERSON"){
        throw new ApiError(403,"Unauthorized");
    }

    next();
}

export const isAdmin=async(req:Request,res:Response,next:NextFunction)=>{
    const userId=req.user?.id;

    if(!userId){
        throw new ApiError(401,"Please login to access this endpoint");
    }

    const user=await prisma.user.findUnique({
        where:{
            id:userId
        }
    })

    if(!user){
        throw new ApiError(404,"User not found");
    }

    if(user.role!=="ADMIN"){
        throw new ApiError(403,"Unauthorized");
    }

    next();
}

