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

  if(user.status!=="ACTIVE"){
    throw new ApiError(403,"User is inactive");
  }

  req.user = {
        id: user.id,
        clerkId: userId,
        status: user.status,
        role: user.role
    };

  next();
};

export const isSalesperson=async(req:Request,res:Response,next:NextFunction)=>{
    const user=req.user;

    if(!user){
        throw new ApiError(401,"Not authenticated");
    }

    if(user.status!=="ACTIVE"){
        throw new ApiError(403,"User is inactive");
    }


    if(user.role!=="SALESPERSON"){
        throw new ApiError(403,"Unauthorized");
    }

    next();
}

export const isAdmin=async(req:Request,res:Response,next:NextFunction)=>{
    const user=req.user;

    if(!user){
        throw new ApiError(401,"Not authenticated");
    }

    if(user.status!=="ACTIVE"){
        throw new ApiError(403,"User is inactive");
    }

    if(user.role!=="ADMIN"){
        throw new ApiError(403,"Unauthorized");
    }

    next();
}

