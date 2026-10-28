import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TlistClosureRequestsQuery, TreviewClosureRequest } from "../schemas/inquiryClosureRequestSchema.js";
import ApiError from "../utils/ApiError.js";
import { AWAITING_CUSTOMER_MESSAGE, countAwaitingCustomer, lockInquiry } from "./inquiry.services.js";

const staffName={
    select:{
        id:true,
        name:true
    }
} satisfies Prisma.UserDefaultArgs;

const requestInclude={
    inquiry:{
        select:{
            id:true,
            status:true,
            product:{
                select:{
                    id:true,
                    name:true
                }
            }
        }
    },
    requestedBy:staffName,
    reviewedBy:staffName
} satisfies Prisma.InquiryClosureRequestInclude;

// Locks the request's inquiry before touching the request, the same order every closure
// and quotation change uses, so a decision can't interleave with them.
async function lockRequestInquiry(tx:Prisma.TransactionClient,requestId:number){
    const request=await tx.inquiryClosureRequest.findUnique({
        where:{
            id:requestId
        },
        select:{
            inquiryId:true
        }
    });

    if(!request){
        throw new ApiError(404,"Closure request not found");
    }

    const inquiry=await lockInquiry(tx,request.inquiryId);

    if(!inquiry){
        throw new ApiError(404,"Inquiry not found");
    }

    return {inquiryId:request.inquiryId,inquiry};
}

// Only a PENDING request can be decided; a concurrent decision makes this match nothing.
async function recordDecision(
    tx:Prisma.TransactionClient,
    requestId:number,
    status:"APPROVED"|"REJECTED",
    adminId:number,
    reviewNote:string|null
){
    const result=await tx.inquiryClosureRequest.updateMany({
        where:{
            id:requestId,
            status:"PENDING"
        },
        data:{
            status,
            reviewedById:adminId,
            reviewNote,
            reviewedAt:new Date()
        }
    });

    if(result.count===0){
        throw new ApiError(409,"This closure request has already been reviewed");
    }
}

export const InquiryClosureRequestService={
    list:async(query:TlistClosureRequestsQuery["query"])=>{
        const {page,limit,status}=query;
        const where:Prisma.InquiryClosureRequestWhereInput={status};

        const [requests,totalRequests]=await prisma.$transaction([
            prisma.inquiryClosureRequest.findMany({
                where,
                include:requestInclude,
                orderBy:{
                    createdAt:"desc"
                },
                skip:(page-1)*limit,
                take:limit
            }),
            prisma.inquiryClosureRequest.count({where})
        ]);

        return {
            requests,
            meta:{
                page,
                limit,
                totalPages:Math.ceil(totalRequests/limit),
                totalRequests
            }
        };
    },

    // Approval, the inquiry closing and its history entry commit together or not at all.
    approve:async(params:TreviewClosureRequest["params"],body:TreviewClosureRequest["body"],adminId:number)=>{
        const {requestId}=params;
        const reviewNote=body.reviewNote || null;

        return await prisma.$transaction(async(tx)=>{
            const {inquiryId,inquiry}=await lockRequestInquiry(tx,requestId);

            await recordDecision(tx,requestId,"APPROVED",adminId,reviewNote);

            if(inquiry.status!=="IN_PROGRESS"){
                throw new ApiError(409,"The inquiry is no longer in progress");
            }

            if(await countAwaitingCustomer(tx,inquiryId)>0){
                throw new ApiError(409,AWAITING_CUSTOMER_MESSAGE);
            }

            await tx.inquiry.update({
                where:{
                    id:inquiryId
                },
                data:{
                    status:"CLOSED"
                }
            });

            const activity=await tx.inquiryActivity.create({
                data:{
                    inquiryId,
                    salespersonId:adminId,
                    activityType:"CLOSURE_APPROVED",
                    closureReason:"OTHER",
                    note:reviewNote
                }
            });

            const request=await tx.inquiryClosureRequest.findUniqueOrThrow({
                where:{
                    id:requestId
                },
                include:requestInclude
            });

            return {request,activity};
        });
    },

    // The inquiry stays in progress; the salesperson can request again or use a named reason.
    reject:async(params:TreviewClosureRequest["params"],body:TreviewClosureRequest["body"],adminId:number)=>{
        const {requestId}=params;
        const reviewNote=body.reviewNote || null;

        return await prisma.$transaction(async(tx)=>{
            const {inquiryId}=await lockRequestInquiry(tx,requestId);

            await recordDecision(tx,requestId,"REJECTED",adminId,reviewNote);

            const activity=await tx.inquiryActivity.create({
                data:{
                    inquiryId,
                    salespersonId:adminId,
                    activityType:"CLOSURE_REJECTED",
                    note:reviewNote
                }
            });

            const request=await tx.inquiryClosureRequest.findUniqueOrThrow({
                where:{
                    id:requestId
                },
                include:requestInclude
            });

            return {request,activity};
        });
    }
};
