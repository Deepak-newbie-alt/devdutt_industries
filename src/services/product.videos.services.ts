import prisma from "../lib/prisma.js";
import type { TcreateProductVideoInput } from "../schemas/productVideosSchema.js";


export const productVideoService={
    createProductVideo:async(body:TcreateProductVideoInput["body"])=>{
        const productVideo=await prisma.productVideo.create({
            data:{
                productId:body.productId,
                youtube_url:body.youtube_url,
                title:body.title,
                display_order:body.display_order
            }
        })

        return productVideo;
    }
}