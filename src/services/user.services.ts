import prisma from "../lib/prisma.js";
import type { TcreateUserInput } from "../schemas/userSchema.js";


export const UserService={
    createSalesman:async(body:TcreateUserInput["body"])=>{
        const {name,email,phone,password}=body;

        const user=await prisma.user.create({
            data:{
                name,
                email,
                phone,
                passwordHash:password,
                role:"SALESPERSON"
            }
        })

        return user;
    }
}