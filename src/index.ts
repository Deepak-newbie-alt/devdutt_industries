import express from "express";
import productRoutes from "./routes/products.routes.js";
import categoryRoutes from "./routes/categories.routes.js";
import productImageRoutes from "./routes/product.images.routes.js";
import productVideoRoutes from "./routes/product.videos.routes.js";
import productBrochureRoutes from "./routes/product.brochures.routes.js";

import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 8000;

app.use("/api/v1/products",productRoutes);
app.use("/api/v1/category",categoryRoutes);
app.use("/api/v1/product/images",productImageRoutes);
app.use("/api/v1/product/videos",productVideoRoutes);
app.use("/api/v1/product/brochure",productBrochureRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});