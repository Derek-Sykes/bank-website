import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/users.js";
import itemRoutes from "./routes/items.js";
import categoryRoutes from "./routes/category.js";
import { authenticateToken } from "./middleware/authenticateToken.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.status(200).send("Hello World!");
});

app.use("/users", userRoutes);
app.use(authenticateToken);
app.use("/items", itemRoutes);
app.use("/categorys", categoryRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
