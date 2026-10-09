import z from "zod";

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