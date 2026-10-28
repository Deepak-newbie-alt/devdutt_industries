import prisma from "../lib/prisma.js";
import type { TcreateProductImageInput, TproductImageIdParams } from "../schemas/productImagesSchema.js";


export const productImageService={
    createProductImage:async(body:TcreateProductImageInput["body"])=>{
        const productImage=await prisma.productImage.create({
            data:{
                productId:body.productId,
                imageUrl:body.imageUrl,
                displayOrder:body.displayOrder
            }
        })

        return productImage;
    },

    // Removes one record; a missing id is reported as 404 by the error middleware (P2025).
    deleteProductImage:async(params:TproductImageIdParams["params"])=>{
        await prisma.productImage.delete({
            where:{
                id:params.imageId
            }
        });
    }
}
