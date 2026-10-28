import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { InquiryStatus } from "../generated/prisma/enums.js";
import type { TclaimInquiry, TcloseInquiry, TcreateInquiryInput, TgetInquiryActivity, TgetInquiryParams, TgetInquiryQuery, TinquiryActivity } from "../schemas/inquirySchema.js";
import ApiError from "../utils/ApiError.js";
import { getTodayInIndiaDbDate } from "../utils/dateOnly.js";
import { CustomerOtpService } from "./customer.otp.services.js";

// The assigned or acting staff member's name, so screens can show names instead of ids.
const staffNameSelect={
    select:{
        id:true,
        name:true
    }
} satisfies Prisma.UserDefaultArgs;

// Locks the inquiry row until the transaction ends, so closing it and moving its
// quotation forward (send, new revision) can't interleave.
export const lockInquiry=async(tx:Prisma.TransactionClient,inquiryId:number)=>{
    const rows=await tx.$queryRaw<{status:InquiryStatus;salespersonId:number|null}[]>`
        SELECT "status", "salespersonId" FROM "inquiries" WHERE "id" = ${inquiryId} FOR UPDATE`;

    return rows[0] ?? null;
}


export const InquiryService={
    createInquiry:async(body:TcreateInquiryInput["body"])=>{
        // Counted outside the transaction so a wrong code is recorded even if creation fails.
        await CustomerOtpService.checkCode(body.challengeId,body.code,{
            purpose:"INQUIRY_SUBMISSION",
            phoneNumber:body.phoneNumber
        });

        return await prisma.$transaction(async(tx)=>{
            // The code is used up only if the inquiry is created.
            await CustomerOtpService.consume(tx,body.challengeId);

            const inquiry=await tx.inquiry.create({
            data:{
                productId:body.productId,
                phoneNumber:body.phoneNumber,
                requirement:body.requirement
            }
        })

        const activity=await tx.inquiryActivity.create({
            data:{
                inquiryId:inquiry.id,
                activityType:"CREATED"
            }
        })

        return {inquiry,activity};
        })
    },

    getInquiries: async (
        query: TgetInquiryQuery["query"],
        actor: Actor
        ) => {
        const { page, limit, id, status } = query;

        const where: Prisma.InquiryWhereInput = {
            ...(status && { status }),
            ...(id && { id }),

            ...(actor.role !== "ADMIN" && {
            OR: [
                {
                status: "OPEN",
                salespersonId: null,
                },
                {
                status: "IN_PROGRESS",
                salespersonId: actor.id,
                },
                {
                status: "CLOSED",
                salespersonId: actor.id,
                },
            ],
            }),
        };

        const skip = (page - 1) * limit;

        const prismaQuery: Prisma.InquiryFindManyArgs = {
            take: limit,
            skip,
            where,
            orderBy: {
            createdAt: "desc",
            },
            include: {
            product: true,
            salesperson: staffNameSelect,
            quotation: {
                select: {
                id: true,
                quotationNumber: true,
                },
            },
            },
        };

        return prisma.inquiry.findMany(prismaQuery);
        },
    getInquiryById:async(params:TgetInquiryParams["params"],actor:Actor)=>{
        const {inquiryId}=params;

        const inquiry=await prisma.inquiry.findUnique({
            where:{
                id:inquiryId
            },
            include:{
                product:true,
                salesperson:staffNameSelect,
                quotation:{
                    select:{
                        id:true,
                        quotationNumber:true
                    }
                }
            }
        })

        if(!inquiry){
            throw new ApiError(404,"Inquiry not found");
        }

        const isOwner = actor.id === inquiry.salespersonId;

        const canAccessUnassignedOpen =
                inquiry.status === "OPEN" &&
                inquiry.salespersonId === null;

        if (
        actor.role !== "ADMIN" &&
        !isOwner &&
        !canAccessUnassignedOpen
        ) {
            throw new ApiError(403,"Forbidden can't access this resource");
        }
        
        return inquiry;
    },
    claimInquiry:async(params:TclaimInquiry["params"],salespersonId:number)=>{
        const {inquiryId}=params;

        return await prisma.$transaction(async(tx)=>{
            const result=await tx.inquiry.updateMany({
            where:{
                id:inquiryId,
                status:"OPEN",
                salespersonId:null,
                // A quotation already belongs to someone; claiming would split ownership.
                quotation:null
            },
            data:{
                status:"IN_PROGRESS",
                salespersonId
            }
        })

        if(result.count==0){
            throw new ApiError(409,"Inquiry already taken by a salesman")
        }

        const inquiry=await tx.inquiry.findUniqueOrThrow({
            where:{
                id:inquiryId
            }
        })

        const activity=await tx.inquiryActivity.create({
            data:{
                inquiryId:inquiryId,
                salespersonId,
                activityType:"CLAIMED"
            }
        })

        return {inquiry,activity};
        })
    },
    contactCustomer:async(params:TinquiryActivity["params"],body:TinquiryActivity["body"],salespersonId:number)=>{
        const {inquiryId}=params;
        const {note}=body;

        const inquiry=await prisma.inquiry.findUnique({
                where:{
                    id:inquiryId
                }
        })

        if(!inquiry){
            throw new ApiError(404,"Inquiry not found");
        }

        if(inquiry.salespersonId!==salespersonId){
            throw new ApiError(403,"Forbidden can't access other salesperson inquiry");

        }

        // A closed inquiry's history is final.
        if(inquiry.status!=="IN_PROGRESS"){
            throw new ApiError(409,"Activity can only be added to in-progress inquiries");
        }

        const activity=await prisma.inquiryActivity.create({
            data:{
                inquiryId:inquiryId,
                salespersonId,
                activityType:"CUSTOMER_CONTACTED",
                note:note
            }
        })

        return activity;
    },
    addNote:async(params:TinquiryActivity["params"],body:TinquiryActivity["body"],salespersonId:number)=>{
        const {inquiryId}=params;
        const {note}=body;

        const inquiry=await prisma.inquiry.findUnique({
                where:{
                    id:inquiryId
                }
        })

        if(!inquiry){
            throw new ApiError(404,"Inquiry not found");
        }

        if(inquiry.salespersonId!==salespersonId){
            throw new ApiError(403,"Forbidden can't access other salesperson inquiry");

        }

        // A closed inquiry's history is final.
        if(inquiry.status!=="IN_PROGRESS"){
            throw new ApiError(409,"Activity can only be added to in-progress inquiries");
        }

        const activity=await prisma.inquiryActivity.create({
            data:{
                inquiryId:inquiryId,
                salespersonId,
                activityType:"NOTE_ADDED",
                note:note
            }
        })

        return activity;
    },
    closeInquiry:async(params:TcloseInquiry["params"],body:TcloseInquiry["body"],salespersonId:number)=>{
        const {inquiryId}=params;
        const {reason,note}=body;

        return await prisma.$transaction(async(tx)=>{
            const inquiryExists=await lockInquiry(tx,inquiryId);

            if(!inquiryExists){
                throw new ApiError(404,"Inquiry not found");
            }

            if(inquiryExists.salespersonId!==salespersonId){
                throw new ApiError(403,"Forbidden can't access other salesperson inquiry");

            }

            if(inquiryExists.status!=="IN_PROGRESS"){
                throw new ApiError(409,"Inquiry cannot be closed");
            }

            // The customer can still accept or reject a sent, unexpired quotation; their
            // response closes the inquiry, or it can be closed here once the quotation expires.
            const awaitingCustomer=await tx.quotationRevision.count({
                where:{
                    quotation:{
                        inquiryId
                    },
                    quotationRevisionStatus:"SENT",
                    validUntil:{
                        gte:getTodayInIndiaDbDate()
                    }
                }
            })

            if(awaitingCustomer>0){
                throw new ApiError(409,"A quotation is waiting for the customer's response. Close the inquiry after they respond or the quotation expires.");
            }

            await tx.inquiry.update({
            where:{
                id:inquiryId
            },
            data:{
                status:"CLOSED"
            }
        })

        const activity=await tx.inquiryActivity.create({
            data:{
                inquiryId:inquiryId,
                salespersonId,
                closureReason:reason,
                note:note || null,
                activityType:"STATUS_CHANGED"
            }
        })

        const inquiry=await tx.inquiry.findUniqueOrThrow({
            where:{
                id:inquiryId
            }
        })

        return {inquiry,activity};
        })
    },
    getActivities: async (
        params: TgetInquiryActivity["params"],
        actor: Actor
        ) => {
        const { inquiryId } = params;

        // 1. Find the parent inquiry
        const inquiry = await prisma.inquiry.findUnique({
            where: {
            id: inquiryId,
            },
            select: {
            id: true,
            status: true,
            salespersonId: true,
            },
        });

        // 2. Check whether the inquiry exists
        if (!inquiry) {
            throw new ApiError(404, "Inquiry not found");
        }

        // 3. Check access permissions
        if (actor.role !== "ADMIN") {
            const isOwner = inquiry.salespersonId === actor.id;

            const canAccessUnassignedOpen =
            inquiry.status === "OPEN" &&
            inquiry.salespersonId === null;

            if (!isOwner && !canAccessUnassignedOpen) {
            throw new ApiError(
                403,
                "Forbidden: can't access this resource"
            );
            }
        }

        // 4. Fetch the activity history
        const activities = await prisma.inquiryActivity.findMany({
            where: {
            inquiryId,
            },
            include: {
            salesperson: staffNameSelect,
            },
            orderBy: {
            createdAt: "asc",
            },
        });

        return activities;
        },
}