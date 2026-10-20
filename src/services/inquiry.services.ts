import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TclaimInquiry, TcreateInquiryInput, TgetInquiryParams, TgetInquiryQuery, TinquiryActivity } from "../schemas/inquirySchema.js";
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

    getInquiries:async(query:TgetInquiryQuery["query"])=>{
        const {page,limit,id}=query;
        const where:Prisma.InquiryWhereInput={
            status:"OPEN"
        }

        if(id){
            where.id=id;
        }

        const skip=(page-1)*limit;

        const prismaQuery:Prisma.InquiryFindManyArgs={
            take:limit,
            skip,
            where,
            orderBy:{
                createdAt:"desc"
            },
            include:{
                product:true
            }
        };

        const inquiries=await prisma.inquiry.findMany(prismaQuery);

        return inquiries;
    },
    getInquiryById:async(params:TgetInquiryParams["params"])=>{
        const {inquiryId}=params;

        const inquiry=await prisma.inquiry.findUnique({
            where:{
                id:inquiryId
            },
            include:{
                product:true
            }
        })
        
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
    getActivities:async(params:TinquiryActivity["params"])=>{
        const {inquiryId}=params;

        const activities=await prisma.inquiryActivity.findMany({
            where:{
                inquiryId:inquiryId
            },
            orderBy:{
                createdAt:"asc"
            }
        })

        return activities;
    }
}