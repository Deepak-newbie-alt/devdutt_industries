import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { TcreateInquiryInput, TgetInquiryParams, TgetInquiryQuery } from "../schemas/inquirySchema.js";



export const InquiryService={
    createInquiry:async(body:TcreateInquiryInput["body"])=>{
        const inquiry=await prisma.inquiry.create({
            data:{
                productId:body.productId,
                phoneNumber:body.phoneNumber,
                requirement:body.requirement
            }
        })

        return inquiry;
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
    }
}