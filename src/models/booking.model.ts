import mongoose from "mongoose";

const bookingModel = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'users',
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'rooms',
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (value: Date): boolean {
                return this.startTime < value;
            },
            message: 'End time must be after start time.',
        },
    },
    purpose: String,
    attendeeCount: {
        type: Number,
        min: [1, 'Attendee count should be at least 1.'],
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled'],
        default: 'confirmed',
    },
    cancelledAt: {
        type: Date,
        default: null
    }
}, { timestamps: true})

export const Booking = mongoose.model('Booking', bookingModel, 'bookings');