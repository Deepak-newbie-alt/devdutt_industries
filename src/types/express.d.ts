// src/types/express.d.ts
import { UserRole,UserStatus } from "../generated/prisma/enums.ts";

declare global {
  namespace Express {
    interface User {
      id:number
      clerkId:string,
      status:UserStatus,
      role:UserRole
    }

    interface Request {
      validated?:unknown;
      user?:User
    }
  }
}

export {};