import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { InquiryStatus } from "../generated/prisma/enums.js";
import type { TclaimInquiry, TcloseInquiry, TclosureRequest, TcreateInquiryInput, TcustomerInquiryHistory, TgetInquiryActivity, TgetInquiryParams, TgetInquiryQuery, TinquiryActivity } from "../schemas/inquirySchema.js";
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

// The checks below are only meaningful while the caller holds lockInquiry: every path that
// sends a quotation or creates/decides a closure request takes the same lock first.

// Sent, unexpired quotations the customer can still accept or reject.
export const countAwaitingCustomer=(tx:Prisma.TransactionClient,inquiryId:number)=>
    tx.quotationRevision.count({
        where:{
            quotation:{
                inquiryId
            },
            quotationRevisionStatus:"SENT",
            validUntil:{
                gte:getTodayInIndiaDbDate()
            }
        }
    });

export const hasPendingClosureRequest=async(tx:Prisma.TransactionClient,inquiryId:number)=>
    (await tx.inquiryClosureRequest.count({
        where:{
            inquiryId,
            status:"PENDING"
        }
    }))>0;

export const AWAITING_CUSTOMER_MESSAGE="A quotation is waiting for the customer's response. Close the inquiry after they respond or the quotation expires.";
export const PENDING_CLOSURE_MESSAGE="A closure request for this inquiry is waiting for an admin's review";

// Newest inquiries returned to a customer per verified lookup; the total is returned too.
const CUSTOMER_HISTORY_LIMIT=50;


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

            // Same rule as the public catalog: inactive products can't be enquired about.
            // Throwing here rolls back the consume, so the code stays usable.
            const product=await tx.product.findFirst({
                where:{
                    id:body.productId,
                    status:"ACTIVE"
                },
                select:{
                    id:true
                }
            })

            if(!product){
                throw new ApiError(404,"This product is no longer available for enquiries");
            }

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

    // Customer-facing: only what the customer told us and where it stands. No staff,
    // activity history, closure details, prices or link tokens.
    getCustomerInquiryHistory:async(body:TcustomerInquiryHistory["body"])=>{
        // Counted outside the transaction so a wrong code is recorded even if the lookup fails.
        await CustomerOtpService.checkCode(body.challengeId,body.code,{
            purpose:"INQUIRY_HISTORY_LOOKUP",
            phoneNumber:body.phoneNumber
        });

        const {inquiries,totalInquiries}=await prisma.$transaction(async(tx)=>{
            // Single use: the code is spent together with the read.
            await CustomerOtpService.consume(tx,body.challengeId);

            const where={phoneNumber:body.phoneNumber} satisfies Prisma.InquiryWhereInput;

            const inquiries=await tx.inquiry.findMany({
                where,
                orderBy:[{createdAt:"desc"},{id:"desc"}],
                take:CUSTOMER_HISTORY_LIMIT,
                select:{
                    id:true,
                    createdAt:true,
                    requirement:true,
                    status:true,
                    product:{
                        select:{
                            name:true
                        }
                    },
                    quotation:{
                        select:{
                            quotationNumber:true,
                            // Drafts are internal; the customer only sees what was sent to them.
                            revisions:{
                                where:{
                                    quotationRevisionStatus:{not:"DRAFT"}
                                },
                                orderBy:{revisionNumber:"desc"},
                                take:1,
                                select:{
                                    revisionNumber:true,
                                    quotationRevisionStatus:true,
                                    validUntil:true
                                }
                            }
                        }
                    }
                }
            });

            const totalInquiries=await tx.inquiry.count({where});

            return {inquiries,totalInquiries};
        });

        const today=getTodayInIndiaDbDate();

        return {
            inquiries:inquiries.map((inquiry)=>{
                const revision=inquiry.quotation?.revisions[0];

                return {
                    id:inquiry.id,
                    createdAt:inquiry.createdAt,
                    requirement:inquiry.requirement,
                    status:inquiry.status,
                    product:inquiry.product,
                    quotation:inquiry.quotation && revision ? {
                        quotationNumber:inquiry.quotation.quotationNumber,
                        revisionNumber:revision.revisionNumber,
                        status:revision.quotationRevisionStatus,
                        validUntil:revision.validUntil,
                        // Same rule as getCustomerQuotation.
                        canRespond:
                            revision.quotationRevisionStatus==="SENT" &&
                            revision.validUntil>=today
                    } : null
                };
            }),
            totalInquiries
        };
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
                },
                // At most one; lets the page show that a closure awaits an admin.
                closureRequests:{
                    where:{
                        status:"PENDING"
                    },
                    select:{
                        id:true,
                        note:true,
                        createdAt:true,
                        requestedBy:staffNameSelect
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

            // An admin decides a pending request; closing here would leave it dangling.
            if(await hasPendingClosureRequest(tx,inquiryId)){
                throw new ApiError(409,PENDING_CLOSURE_MESSAGE);
            }

            // The customer can still accept or reject a sent, unexpired quotation; their
            // response closes the inquiry, or it can be closed here once the quotation expires.
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
    // OTHER closures: the inquiry stays in progress until an admin approves the request.
    requestClosure:async(params:TclosureRequest["params"],body:TclosureRequest["body"],salespersonId:number)=>{
        const {inquiryId}=params;
        const {note}=body;

        return await prisma.$transaction(async(tx)=>{
            const inquiry=await lockInquiry(tx,inquiryId);

            if(!inquiry){
                throw new ApiError(404,"Inquiry not found");
            }

            if(inquiry.salespersonId!==salespersonId){
                throw new ApiError(403,"Forbidden can't access other salesperson inquiry");
            }

            if(inquiry.status!=="IN_PROGRESS"){
                throw new ApiError(409,"Only in-progress inquiries can be closed");
            }

            if(await hasPendingClosureRequest(tx,inquiryId)){
                throw new ApiError(409,PENDING_CLOSURE_MESSAGE);
            }

            if(await countAwaitingCustomer(tx,inquiryId)>0){
                throw new ApiError(409,AWAITING_CUSTOMER_MESSAGE);
            }

            const request=await tx.inquiryClosureRequest.create({
                data:{
                    inquiryId,
                    requestedById:salespersonId,
                    note
                }
            })

            const activity=await tx.inquiryActivity.create({
                data:{
                    inquiryId,
                    salespersonId,
                    activityType:"CLOSURE_REQUESTED",
                    note
                }
            })

            return {request,activity};
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