import asyncHandler from "../utils/asyncHandler.js";
import {loginUser, registerUser} from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
    const { message } = await registerUser();
    res.json({ success: true, data: { message} });
})


export const login = asyncHandler(async (req, res) => {
    const { message } = await loginUser();
    res.json({ success: true, data: { message} });
})
