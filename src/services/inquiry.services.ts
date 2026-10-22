import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TclaimInquiry, TcreateInquiryInput, TgetInquiryActivity, TgetInquiryParams, TgetInquiryQuery, TinquiryActivity } from "../schemas/inquirySchema.js";
import ApiError from "../utils/ApiError.js";



export const InquiryService={
    createInquiry:async(body:TcreateInquiryInput["body"])=>{
        return await prisma.$transaction(async(tx)=>{
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
                product:true
            }
        })

        if(!inquiry){
            throw new ApiError(404,"Inquiry not found");
        }

        if(actor.role!=="ADMIN" && actor.id!==inquiry.salespersonId){
            throw new ApiError(403,"Can't access this resource");
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
                salespersonId:null
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
    closeInquiry:async(params:TinquiryActivity["params"],body:TinquiryActivity["body"],salespersonId:number)=>{
        const {inquiryId}=params;
        const {note}=body;

        return await prisma.$transaction(async(tx)=>{
            const inquiryExists=await tx.inquiry.findUnique({
                where:{
                    id:inquiryId
                }
            })

            if(!inquiryExists){
                throw new ApiError(404,"Inquiry not found");
            }

            if(inquiryExists.salespersonId!==salespersonId){
                throw new ApiError(403,"Forbidden can't access other salesperson inquiry");

            }

            const result=await tx.inquiry.updateMany({
            where:{
                id:inquiryId,
                status:"IN_PROGRESS"
            },
            data:{
                status:"CLOSED"
            }
        })

        if(result.count==0){
            throw new ApiError(409,"Inquiry cannot be closed");
        }

        const activity=await tx.inquiryActivity.create({
            data:{
                inquiryId:inquiryId,
                salespersonId,
                note:note,
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
            orderBy: {
            createdAt: "asc",
            },
        });

        return activities;
        },
}