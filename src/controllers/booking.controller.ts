import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { getMyBookings, cancelCreatedBooking, createNewBooking, type ListMyBookingsQuery } from "../services/booking.service.js";
import type { CreateBookingInput } from "../validation/booking.schema.js";

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
    const result = await getMyBookings(req.user!.id, req.query as unknown as ListMyBookingsQuery);
    res.status(200).json({ success: true, result });
})

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
    const result = await createNewBooking(req.user!.id, req.body as CreateBookingInput);
    res.status(201).json({ success: true, result });
})

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
    const result = await cancelCreatedBooking(req.params.id as string, req.user!);
    res.status(200).json({ success: true, result });
})