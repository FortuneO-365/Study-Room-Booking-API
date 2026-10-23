import type { NextFunction, Request, Response } from "express";
import ApiError from "../utils/ApiError.js";
import type { Role } from "../constants/roles.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

interface TokenPayload {
    sub: string;
    role: Role
}

export function requireAuth(req: Request, _res: Response, next: NextFunction){
    const header = req.headers.authorization;

    if(!header || !header.startsWith('Bearer ')){
        return next(new ApiError(401, 'UNAUTHORIZED', 'Log in to continue'));
    }

    const token = header.slice('Bearer '.length);

    try {
        const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch {
        next(new ApiError(401, 'UNAUTHORIZED', 'Your session is invalid or expired. Log in again.'))
    }

}