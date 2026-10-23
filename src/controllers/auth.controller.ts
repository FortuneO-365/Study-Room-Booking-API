import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import {loginUser, registerUser} from '../services/auth.service.js';
import type { LoginInput, RegisterInput } from "../validation/user.schema.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
    const result = await registerUser(req.body as RegisterInput);
    res.status(201).json({ success: true, result });
})


export const login = asyncHandler(async (req: Request, res: Response) => {
    const result = await loginUser(req.body as LoginInput);
    res.status(200).json({ success: true, result });
})
