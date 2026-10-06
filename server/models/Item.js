
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    size: {
      type: String,
      required: true
    },

    condition: {
      type: String,
      enum: ["New", "Like New", "Good", "Fair"],
      required: true
    },

    imageUrl: {
      type: String,
      default: ""
    },

    exchangeType: {
      type: String,
      enum: ["Swap", "Donate"],
      required: true
    },

    ownerName: {
      type: String,
      required: true
    },

    ownerEmail: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["Available", "Exchanged"],
      default: "Available"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Item", itemSchema);
