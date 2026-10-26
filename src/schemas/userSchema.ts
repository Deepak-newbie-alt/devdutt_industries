import z from "zod";
import { UserRole, UserStatus } from "../generated/prisma/enums.js";

export const createUserSchema=z.object({
    body:z.object({
        name:z
        .string()
        .trim()
        .min(1,"Name is required"),
        email:z
        .string()
        .email("Please provide a valid email"),
        phone:z
        .string()
        .trim()
        .min(1,"Phone number is required"),
        password:z
        .string()
        .trim()
        .min(8,"Password must be 8 characters long")
    })
})

export type TcreateUserInput=z.infer<typeof createUserSchema>;

export const idParamsSchema=z.object({
    params:z.object({
        id:z
        .coerce
        .number()
        .int("Id must be integer")
        .positive("Id must be positive")
    })
})

export type TidParams=z.infer<typeof idParamsSchema>;

export const updateUserStatusSchema=z.object({
    body:z.object({
        status:z
        .enum(UserStatus)
    }),

    params:idParamsSchema.shape.params
})

export type TupdateUserStatus=z.infer<typeof updateUserStatusSchema>;

export const changeUserRoleSchema=z.object({
    body:z.object({
        role:z
        .enum(UserRole)
    }),

    params:idParamsSchema.shape.params
})

export type TchangeUserRole=z.infer<typeof changeUserRoleSchema>;

export const updateProfileSchema=z.object({
    body:z.object({
        name:z
        .string()
        .trim()
        .optional(),
        phone:z
        .string()
        .trim()
        .optional()
    }).refine(
        (data)=>Object.keys(data).length>0,
        {message:"At one field must be provided"}
    ),

    params:idParamsSchema.shape.params
})

export type TupdateProfile=z.infer<typeof updateProfileSchema>;

export const listUsersQuerySchema=z.object({
    query:z.object({
        page:z
        .coerce
        .number()
        .int("Page no. must be integer")
        .positive("Page number must be positive")
        .default(1),
        limit:z
        .coerce
        .number()
        .int("Limit must be integer")
        .positive("Limit must be positive")
        .max(100,"Limit exceeded")
        .default(10),
        search:z
        .string()
        .trim()
        .optional(),
        role:z
        .enum(UserRole)
        .optional(),
        status:z
        .enum(UserStatus)
        .optional()
    })
})

export type TlistUsersQuery=z.infer<typeof listUsersQuerySchema>;