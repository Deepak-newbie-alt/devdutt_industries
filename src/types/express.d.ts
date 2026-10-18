// src/types/express.d.ts

declare global {
  namespace Express {
    interface User {
      id:number
      clerkId:string
    }

    interface Request {
      validated?:unknown;
      user?:User
    }
  }
}

export {};