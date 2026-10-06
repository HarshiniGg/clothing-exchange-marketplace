
const mongoose = require("mongoose");

const swapRequestSchema = new mongoose.Schema(
  {
    requesterItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },

    requestedItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },

    requesterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("SwapRequest", swapRequestSchema);
