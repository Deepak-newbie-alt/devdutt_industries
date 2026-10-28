import z from "zod";
import { InquiryClosureRequestStatus } from "../generated/prisma/enums.js";

export const listClosureRequestsQuerySchema=z.object({
    query:z.object({
        page:z
        .coerce
        .number()
        .int("Page number should be an integer")
        .positive("Page number should be positive")
        .default(1),
        limit:z
        .coerce
        .number()
        .max(100,"Limit is too high")
        .int("Limit should be an integer")
        .positive("Limit should be positive")
        .default(20),
        status:z
        .enum(InquiryClosureRequestStatus)
        .default("PENDING")
    })
})

export type TlistClosureRequestsQuery=z.infer<typeof listClosureRequestsQuerySchema>;

export const reviewClosureRequestSchema=z.object({
    params:z.object({
        requestId:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    }),
    body:z.object({
        reviewNote:z
        .string()
        .trim()
        .max(350,"Review note is too long")
        .optional()
    // The note is optional, so the request may have no body at all.
    }).default({})
})

export type TreviewClosureRequest=z.infer<typeof reviewClosureRequestSchema>;
