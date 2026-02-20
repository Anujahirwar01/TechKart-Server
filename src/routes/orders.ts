import express from "express";
import {
    allOrders,
    deleteOrder,
    getSingleOrder,
    myOrders,
    newOrder,
    processOrder
} from "../controllers/order.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();

app.post("/new", newOrder);
app.get("/my", myOrders);


app.get("/all", allOrders);

app.get("/:id", getSingleOrder);
app.put("/:id", adminOnly, processOrder);
app.delete("/:id", adminOnly, deleteOrder);

export default app;