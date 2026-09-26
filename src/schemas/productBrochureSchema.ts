import z from "zod";

export const createProductBrochureSchema=z.object({
    body:z.object({
        productId:z
        .coerce
        .number()
        .int("Product id must be an integer")
        .positive("Product id must be positive"),
        fileUrl:z
        .string()
        .trim()
        .min(1,"You must provide file url")
        .url("Please provide a valid url"),
        fileName:z
        .string()
        .min(1,"Please provide a file name")
        .max(255,"File name is too long")
    })
})

export type TcreateProductBrochureInput=z.infer<typeof createProductBrochureSchema>;