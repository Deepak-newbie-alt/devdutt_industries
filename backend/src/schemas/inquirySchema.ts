import z from "zod";
import { InquiryClosureReason, InquiryStatus } from "../generated/prisma/enums.js";

// Indian mobile number without country code; shared with customer OTP requests.
export const customerPhoneSchema=z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid phone number");

// Proof of phone ownership, checked and consumed by the action itself.
export const otpVerificationSchema=z.object({
    challengeId:z
    .uuid("Invalid verification challenge"),
    code:z
    .string()
    .regex(/^\d{6}$/,"Verification code must be 6 digits")
})

export const createInquirySchema=z.object({
    body:z.object({
        productId:z
        .coerce
        .number()
        .int("Product Id must be an integer")
        .positive("Product id must be positive"),
        phoneNumber:customerPhoneSchema,
        requirement:z
        .string()
        .min(1,"This field is required")
        .max(1200,"Keep the the requirement under 1200")
    }).extend(otpVerificationSchema.shape)
})

export type TcreateInquiryInput=z.infer<typeof createInquirySchema>;

// Customer's own inquiries, for the phone number the code was sent to.
export const customerInquiryHistorySchema=z.object({
    body:z.object({
        phoneNumber:customerPhoneSchema
    }).extend(otpVerificationSchema.shape)
})

export type TcustomerInquiryHistory=z.infer<typeof customerInquiryHistorySchema>;

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
            status:z
            .enum(InquiryStatus)
            .default("OPEN")
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



export const claimInquirySchema=z.object({

    params:z.object({
        inquiryId:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    })
})

export type TclaimInquiry=z.infer<typeof claimInquirySchema>;

export const inquiryActivitySchema=z.object({
    body:z.object({
        note:z
        .string()
        .trim()
        .min(1,"Note is required")
        .max(350,"Note is too long"),
    }),

    params:z.object({
        inquiryId:z
        .coerce
        .number()
        .int("Id must be an integer")
        .positive("Id must be positive")
    })
})

export type TinquiryActivity=z.infer<typeof inquiryActivitySchema>;

// The named reasons close immediately; OTHER needs an admin's approval through a closure request.
export const closeInquirySchema=z.object({
    body:z.object({
        reason:z
        .enum(InquiryClosureReason,{error:"Choose a reason for closing the inquiry"})
        .exclude(["OTHER"],{error:"Closing for another reason needs an admin's approval: send a closure request instead"}),
        note:z
        .string()
        .trim()
        .max(350,"Note is too long")
        .optional()
    }),

    params:inquiryActivitySchema.shape.params
})

export type TcloseInquiry=z.infer<typeof closeInquirySchema>;

export const closureRequestSchema=z.object({
    body:z.object({
        note:z
        .string()
        .trim()
        .min(1,"Explain why the inquiry should be closed")
        .max(350,"Note is too long")
    }),

    params:inquiryActivitySchema.shape.params
})

export type TclosureRequest=z.infer<typeof closureRequestSchema>;

export const getInquiryActivitySchema=z.object({
    params:inquiryActivitySchema.shape.params
})

export type TgetInquiryActivity=z.infer<typeof getInquiryActivitySchema>;