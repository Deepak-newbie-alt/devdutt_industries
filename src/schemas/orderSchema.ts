import z from "zod";

export const viewOrdersQuerySchema=z.object({
    query:z.object({
            page:z
            .coerce
            .number()
            .int("Page must be integer")
            .positive("Page must be positive")
            .default(1),
            limit:z
            .coerce
            .number()
            .int("Limit must be an integer")
            .positive("Limit must be positive")
            .max(100,"Limit is too high")
            .default(10),
            status:z
            .enum(["CONFIRMED","IN_PRODUCTION","READY","DISPATCHED","DELIVERED","CANCELLED"])
            .optional(),
            search:z
            .string()
            .trim()
            .max(60,"Searched order number is too long")
            .optional()
        })
})

export type TviewOrdersQuery=z.infer<typeof viewOrdersQuerySchema>;

export const orderIdParamsSchema=z.object({
    params:z.object({
        orderId:z
        .coerce
        .number()
        .int("Id must be integer")
        .positive("Id must be positive")
    })
})

export type TorderIdParams=z.infer<typeof orderIdParamsSchema>;