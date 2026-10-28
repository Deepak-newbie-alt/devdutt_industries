import prisma from "../lib/prisma.js";
import type { TcreateProductVideoInput, TproductVideoIdParams } from "../schemas/productVideosSchema.js";


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
    },

    // Removes one record; a missing id is reported as 404 by the error middleware (P2025).
    deleteProductVideo:async(params:TproductVideoIdParams["params"])=>{
        await prisma.productVideo.delete({
            where:{
                id:params.videoId
            }
        });
    }
}
