import express from "express";
import productRoutes from "./routes/products.routes.js";
import categoryRoutes from "./routes/categories.routes.js";
import productImageRoutes from "./routes/product.images.routes.js";
import productVideoRoutes from "./routes/product.videos.routes.js";
import productBrochureRoutes from "./routes/product.brochures.routes.js";
import inquiryRoutes from "./routes/inquiry.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import userRoutes from "./routes/users.routes.js";
import orderRoutes from "./routes/order.routes.js";

//jobs
import {startQuotationExpiryJob} from "./jobs/expireQuotationRevisions.js"

import { errorHandler } from "./middlewares/errorMiddleware.js";
import { clerkMiddleware } from "@clerk/express";

const app = express();

app.use(express.json());
app.use(clerkMiddleware());

const PORT = process.env.PORT || 8000;


app.use("/api/v1/products",productRoutes);
app.use("/api/v1/category",categoryRoutes);
app.use("/api/v1/product/images",productImageRoutes);
app.use("/api/v1/product/videos",productVideoRoutes);
app.use("/api/v1/product/brochure",productBrochureRoutes);
app.use("/api/v1/inquiries",inquiryRoutes);
app.use("/api/v1/quotations",quotationRoutes);
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/orders",orderRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

startQuotationExpiryJob();