import z from "zod";

export const createProductVideoSchema=z.object({
    body:z.object({
        productId:z
        .coerce
        .number()
        .int("Product Id must be integer")
        .positive("Product id must be positive"),
        youtube_url:z
        .string()
        .trim()
        .min(1,"Url is required")
        .url("Please provide a valid url"),
        title:z
        .string()
        .trim()
        .min(1,'Title is required')
        .max(200,"Title is too long"),
        display_order:z
        .coerce
        .number()
        .int("Display order must be integer")
        .nonnegative("Display order must not be negative")
        .default(0)
    })
})

export type TcreateProductVideoInput=z.infer<typeof createProductVideoSchema>;