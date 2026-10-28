import z from "zod";
import { youtubeVideoId } from "../utils/youtube.js";

export const createProductVideoSchema=z.object({
    body:z.object({
        productId:z
        .coerce
        .number()
        .int("Product Id must be integer")
        .positive("Product id must be positive"),
        youtubeUrl:z
        .string()
        .trim()
        .min(1,"Url is required")
        .url({ protocol: /^https?$/, message: "Please provide a valid http:// or https:// url" })
        // Shown in YouTube's embedded player, so it must point at one YouTube video.
        .refine((url)=>youtubeVideoId(url)!==null,"Use a link to a YouTube video, e.g. https://www.youtube.com/watch?v=…"),
        title:z
        .string()
        .trim()
        .min(1,'Title is required')
        .max(200,"Title is too long"),
        displayOrder:z
        .coerce
        .number()
        .int("Display order must be integer")
        .nonnegative("Display order must not be negative")
        .default(0)
    })
})

export type TcreateProductVideoInput=z.infer<typeof createProductVideoSchema>;

export const productVideoIdParamsSchema=z.object({
    params:z.object({
        videoId:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    })
})

export type TproductVideoIdParams=z.infer<typeof productVideoIdParamsSchema>;
