import mongoose from "mongoose";
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student',
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    }

}, { timestamps: true });

const roomSchema = new mongoose.Schema({
    roomName: {
        type: String,
        required: true,
        unique: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: 10,
        max: 500
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

const bookingSchema = new mongoose.Schema({
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

userSchema.pre('save', async function () {
    const user = this as mongoose.Document & { passwordHash: string; isModified: (path: string) => boolean };
    if (!user.isModified('passwordHash')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
});

export const User = mongoose.model('User', userSchema, 'users');
export const Room = mongoose.model('Room', roomSchema, 'rooms');
export const Booking = mongoose.model('Booking', bookingSchema, 'bookings');