import express from "express";
import productRoutes from "./routes/products.routes.js";
import categoryRoutes from "./routes/categories.routes.js"

import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 8000;

app.use("/api/v1/products",productRoutes);
app.use("/api/v1/category",categoryRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});