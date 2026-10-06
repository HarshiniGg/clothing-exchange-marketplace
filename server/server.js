
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const itemRoutes = require("./routes/itemRoutes");
const swapRoutes = require("./routes/swapRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Item Routes
app.use("/api/items", itemRoutes);

// Swap Routes
app.use("/api/swaps", swapRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("Clothing Exchange Marketplace Backend is Running!");
});

// Health check API
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend API is working successfully!"
    });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB Connection Failed:", error.message);
    });
