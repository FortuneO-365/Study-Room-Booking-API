import mongoose from "mongoose";

const roomModel = new mongoose.Schema({
    roomName: {
        type: String,
        required: true,
        unique: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: 10,
        max: 200
    },
    amenities: {
        type: [String],
        validate: {
            validator: function (value: string[]) {
                return Array.isArray(value) && value.every(item => typeof item === 'string');
            },
            message: 'Amenities must be an array of strings.',
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    }

}, { timestamps: true });

export const Room = mongoose.model('Room', roomModel, 'rooms');