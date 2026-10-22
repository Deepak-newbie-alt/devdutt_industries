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
        const {page,limit,id,status}=query;
        const where:Prisma.InquiryWhereInput={
            status
        };

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
    getActivities:async(params:TinquiryActivity["params"],actor:Actor)=>{
        const {inquiryId}=params;

        const activities=await prisma.inquiryActivity.findMany({
            where:{
                inquiryId:inquiryId
            },
            orderBy:{
                createdAt:"asc"
            }
        })

        if(actor.role!=="ADMIN" && actor.id!==activities[0]?.salespersonId){
            throw new ApiError(403,"Forbidden can't access this resource");
        }

        return activities;
    }
}