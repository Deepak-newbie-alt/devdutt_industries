import z from "zod";

export const createInquirySchema=z.object({
    body:z.object({
        productId:z
        .coerce
        .number()
        .int("Product Id must be an integer")
        .positive("Product id must be positive"),
        phoneNumber:z
        .string()
        .regex(/^[6-9]\d{9}$/, "Invalid phone number"),
        requirement:z
        .string()
        .min(1,"This field is required")
        .max(1200,"Keep the the requirement under 1200")
    })
})

export type TcreateInquiryInput=z.infer<typeof createInquirySchema>;

export const getInquiryQuerySchema=z.object({
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
            .default(10),
            id:z
            .coerce
            .number()
            .int("Id must be an integer")
            .positive("Id must be positive")
            .optional(),
    })
})

export type TgetInquiryQuery=z.infer<typeof getInquiryQuerySchema>;

export const getInquiryParams=z.object({
    params:z.object({
        inquiryId:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    })
})

export type TgetInquiryParams=z.infer<typeof getInquiryParams>;