import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { getRoomList, getRoomById, createNewRoom, editRoomDetails, removeRoom, getRoomAvailabililty } from "../services/rooms.service.js";
import type { AvailabilityQuery, CreateRoomInput, ListRoomsQuery, RoomIdParam, UpdateRoomInput } from "../validation/room.schema.js";


export const listRooms = asyncHandler(async (req: Request, res: Response) => {
    const result = await getRoomList(req.query as unknown as ListRoomsQuery);
    res.status(200).json({ success: true, result });
})

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.user?.role === "admin";
    const result = await getRoomById(req.params.id as string, includeInactive);
    res.status(200).json({ success: true, result });
})

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.user?.role === "admin";
    const { date } = req.query as AvailabilityQuery;

    const result =  await getRoomAvailabililty(req.params.id as string, date, includeInactive);
    res.status(200).json({ success: true, result });
})

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
    const result =  await createNewRoom(req.body as CreateRoomInput);
    res.status(201).json({ success: true, result });
})

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
    const result = await editRoomDetails(req.params.id as string, req.body as UpdateRoomInput);
    res.status(200).json({ success: true, result });
})

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
    const result = await removeRoom(req.params.id as string)
    res.status(204).json({ success: true, result });
})