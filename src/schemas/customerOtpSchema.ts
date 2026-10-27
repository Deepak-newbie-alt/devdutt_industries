import z from "zod";
import { customerPhoneSchema } from "./inquirySchema.js";

// Inquiry codes go to the phone the customer enters; quotation codes go to the
// phone already on the inquiry, so the client only names the revision.
export const requestOtpChallengeSchema=z.object({
    body:z.discriminatedUnion("purpose",[
        z.object({
            purpose:z.literal("INQUIRY_SUBMISSION"),
            phoneNumber:customerPhoneSchema
        }),
        z.object({
            purpose:z.literal([
                "QUOTATION_ACCEPT",
                "QUOTATION_REJECT",
                "QUOTATION_REQUEST_REVISION"
            ]),
            revisionId:z
            .coerce
            .number()
            .int("Id must be an integer")
            .positive("Id must be positive")
        })
    ])
})

export type TrequestOtpChallenge=z.infer<typeof requestOtpChallengeSchema>;
