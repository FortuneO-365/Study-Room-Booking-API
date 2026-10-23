import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../constants/roles.js";

const userModel = new mongoose.Schema({
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
        enum: ROLES,
        default: 'student',
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    }

}, { timestamps: true });

userModel.pre('save', async function () {
    const user = this as mongoose.Document & { passwordHash: string; isModified: (path: string) => boolean };
    if (!user.isModified('passwordHash')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
});

export const User = mongoose.model('User', userModel, 'users');