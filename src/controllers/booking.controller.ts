import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { getAllBookings, cancelCreatedBooking, createNewBooking } from "../services/booking.service.js";

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
    const result = await getAllBookings();
    res.status(200).json({ success: true, result });
})

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
    const result = await createNewBooking(req.params.id);
    res.status(201).json({ success: true, result });
})

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
    const result = await cancelCreatedBooking();
    res.status(200).json({ success: true, result });
})