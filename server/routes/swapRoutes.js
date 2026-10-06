
const express = require("express");
const router = express.Router();

const SwapRequest = require("../models/SwapRequest");
const Item = require("../models/Item");

// 1. Send a swap request
router.post("/", async (req, res) => {
    try {
        const { requesterItem, requestedItem, requesterEmail } = req.body;

        if (!requesterItem || !requestedItem || !requesterEmail) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });
        }

        if (requesterItem === requestedItem) {
            return res.status(400).json({
                success: false,
                message: "You cannot swap an item with itself"
            });
        }

        const offeredItem = await Item.findById(requesterItem);
        const targetItem = await Item.findById(requestedItem);

        if (!offeredItem || !targetItem) {
            return res.status(404).json({
                success: false,
                message: "One or both clothing items were not found"
            });
        }

        if (offeredItem.ownerEmail !== requesterEmail.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "You can only offer your own item"
            });
        }

        if (offeredItem.ownerEmail === targetItem.ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "You cannot request your own item"
            });
        }

        if (
            offeredItem.status !== "Available" ||
            targetItem.status !== "Available"
        ) {
            return res.status(400).json({
                success: false,
                message: "One or both items are no longer available"
            });
        }

        if (offeredItem.exchangeType !== "Swap" ||
            targetItem.exchangeType !== "Swap") {
            return res.status(400).json({
                success: false,
                message: "Both items must be available for swapping"
            });
        }

        const existingRequest = await SwapRequest.findOne({
            requesterItem,
            requestedItem,
            status: "Pending"
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: "A swap request already exists"
            });
        }

        const swapRequest = await SwapRequest.create({
            requesterItem,
            requestedItem,
            requesterEmail,
            ownerEmail: targetItem.ownerEmail,
            status: "Pending"
        });

        res.status(201).json({
            success: true,
            message: "Swap request sent successfully",
            swapRequest
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});


// 2. Get received swap requests
router.get("/received", async (req, res) => {
    try {
        const { ownerEmail } = req.query;

        if (!ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "Owner email is required"
            });
        }

        const requests = await SwapRequest.find({
            ownerEmail: ownerEmail.toLowerCase()
        })
            .populate("requesterItem")
            .populate("requestedItem")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// 3. Get sent swap requests
router.get("/sent", async (req, res) => {
    try {
        const { requesterEmail } = req.query;

        if (!requesterEmail) {
            return res.status(400).json({
                success: false,
                message: "Requester email is required"
            });
        }

        const requests = await SwapRequest.find({
            requesterEmail: requesterEmail.toLowerCase()
        })
            .populate("requesterItem")
            .populate("requestedItem")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// 4. Accept a swap request
router.patch("/:id/accept", async (req, res) => {
    try {
        const { ownerEmail } = req.body;

        if (!ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "Owner email is required"
            });
        }

        const swapRequest = await SwapRequest.findById(req.params.id);

        if (!swapRequest) {
            return res.status(404).json({
                success: false,
                message: "Swap request not found"
            });
        }

        if (swapRequest.ownerEmail !== ownerEmail.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Only the item owner can accept this request"
            });
        }

        if (swapRequest.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "This request has already been processed"
            });
        }

        const offeredItem = await Item.findById(swapRequest.requesterItem);
        const requestedItem = await Item.findById(swapRequest.requestedItem);

        if (
            !offeredItem ||
            !requestedItem ||
            offeredItem.status !== "Available" ||
            requestedItem.status !== "Available"
        ) {
            return res.status(400).json({
                success: false,
                message: "One or both items are no longer available"
            });
        }

        offeredItem.status = "Exchanged";
        requestedItem.status = "Exchanged";

        await offeredItem.save();
        await requestedItem.save();

        swapRequest.status = "Accepted";
        await swapRequest.save();

        // Reject other pending requests involving these items
        await SwapRequest.updateMany(
            {
                _id: { $ne: swapRequest._id },
                status: "Pending",
                $or: [
                    { requesterItem: { $in: [offeredItem._id, requestedItem._id] } },
                    { requestedItem: { $in: [offeredItem._id, requestedItem._id] } }
                ]
            },
            { $set: { status: "Rejected" } }
        );

        res.status(200).json({
            success: true,
            message: "Swap accepted successfully. Both items are now exchanged.",
            swapRequest
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// 5. Reject a swap request
router.patch("/:id/reject", async (req, res) => {
    try {
        const { ownerEmail } = req.body;

        if (!ownerEmail) {
            return res.status(400).json({
                success: false,
                message: "Owner email is required"
            });
        }

        const swapRequest = await SwapRequest.findById(req.params.id);

        if (!swapRequest) {
            return res.status(404).json({
                success: false,
                message: "Swap request not found"
            });
        }

        if (swapRequest.ownerEmail !== ownerEmail.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Only the item owner can reject this request"
            });
        }

        if (swapRequest.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "This request has already been processed"
            });
        }

        swapRequest.status = "Rejected";
        await swapRequest.save();

        res.status(200).json({
            success: true,
            message: "Swap request rejected successfully",
            swapRequest
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
