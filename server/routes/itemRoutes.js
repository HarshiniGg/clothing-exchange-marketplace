
const express = require("express");
const router = express.Router();

const Item = require("../models/Item");

// 1. Add a new clothing item
router.post("/", async (req, res) => {
    try {
        const newItem = new Item(req.body);
        const savedItem = await newItem.save();

        res.status(201).json({
            success: true,
            message: "Item added successfully",
            item: savedItem
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 2. Get all available clothing items
router.get("/", async (req, res) => {
    try {
        const items = await Item.find({ status: "Available" })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: items.length,
            items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 3. Get a single item by ID
router.get("/:id", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        res.status(200).json({
            success: true,
            item
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 4. Update item details
router.put("/:id", async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item updated successfully",
            item: updatedItem
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 5. Delete an item
router.delete("/:id", async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);

        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 6. Mark item as exchanged
router.patch("/:id/exchange", async (req, res) => {
    try {
        const item = await Item.findByIdAndUpdate(
            req.params.id,
            { status: "Exchanged" },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item marked as exchanged",
            item
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
