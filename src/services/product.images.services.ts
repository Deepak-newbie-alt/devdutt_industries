import prisma from "../lib/prisma.js";
import type { TcreateProductImageInput } from "../schemas/productImagesSchema.js";


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
    }
}