import prisma from "../lib/prisma.js";
import type { TcreateProductVideoInput } from "../schemas/productVideosSchema.js";


export const productVideoService={
    createProductVideo:async(body:TcreateProductVideoInput["body"])=>{
        const productVideo=await prisma.productVideo.create({
            data:{
                productId:body.productId,
                youtubeUrl:body.youtubeUrl,
                title:body.title,
                displayOrder:body.displayOrder
            }
        })

        return productVideo;
    }
}