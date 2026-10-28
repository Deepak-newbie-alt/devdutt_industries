import prisma from "../lib/prisma.js";
import type { TcreateProductBrochureInput, TproductBrochureIdParams } from "../schemas/productBrochureSchema.js";



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
    },

    // Removes one record; a missing id is reported as 404 by the error middleware (P2025).
    deleteProductBrochure:async(params:TproductBrochureIdParams["params"])=>{
        await prisma.productBrochure.delete({
            where:{
                id:params.brochureId
            }
        });
    }
}
