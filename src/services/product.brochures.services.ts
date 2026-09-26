import prisma from "../lib/prisma.js";
import type { TcreateProductBrochureInput } from "../schemas/productBrochureSchema.js";



export const productBrochureService={
    createProductBrochure:async(body:TcreateProductBrochureInput["body"])=>{
        const productBrochure=await prisma.productBrochure.create({
            data:{
                productId:body.productId,
                fileUrl:body.fileUrl,
                fileName:body.fileName
            }
        })

        return productBrochure;
    }
}