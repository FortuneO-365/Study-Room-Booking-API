import { Booking } from "../models/booking.model.js";
import { Room } from "../models/room.model.js";
import ApiError from "../utils/ApiError.js";
import type { CreateRoomInput, ListRoomsQuery, RoomIdParam, UpdateRoomInput } from "../validation/room.schema.js";
import { env } from "../config/env.js";

const SLOT_MS = 30 * 60 * 1000;

function isDuplicateKey(err: unknown): boolean {
    return typeof err === "object" && err !== null && (err as {code?: unknown}).code === 11000;
}

function tzOffsetMs(instant: Date, timezone: string): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(instant);

    const get = ( type: string ) => Number(parts.find((p) => p.type === type)!.value);
    const wallClockAsUtc = Date.UTC(
        get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"),
    );

    const instantTruncated = Math.floor(instant.getTime() / 1000) * 1000
    return wallClockAsUtc - instantTruncated;
}

function localToUtc(date: string, hour: number, minute: number, timezone: string): Date {
    const [y = 0, m = 0, d = 0] = date.split("-").map(Number);
    const wallClockAsUtc = Date.UTC(y, m - 1, d, hour, minute);
    const firstGuess = wallClockAsUtc - tzOffsetMs(new Date(wallClockAsUtc), timezone);
    return new Date(wallClockAsUtc - tzOffsetMs(new Date(firstGuess), timezone));
}

export async function getRoomList(query: ListRoomsQuery){
    const { limit, page, minCapacity } = query;

    const filter: Record<string, unknown> = { isActive: true };
    if (minCapacity) filter.capacity = { $gte: minCapacity }

    const [ data, total ] = await Promise.all([
        Room.find(filter)
            .sort({roomName: 1, _id: 1})
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Room.countDocuments(filter)
    ]);
    return {
        data,
        meta: { page, limit, total}
    };
}

export async function getRoomById(roomId: string, includeInactive = false) {
    const filter: Record<string, unknown> = { _id: roomId };
    if (!includeInactive) filter.isActive = true;
  
    const room = await Room.findOne(filter);
    if (!room) {
      throw ApiError.notFound("Room not found.");
    }
  
    return room;
}

export async function getRoomAvailabililty(roomId: string, date: string, includeInactive: boolean){
    await getRoomById(roomId, includeInactive);

    const tz = env.buildingTimezone;
    const dayStart = localToUtc(date, env.openingHour, 0, tz);
    const dayEnd =localToUtc(date, env.closingHour, 0, tz);

    const bookings = await Booking.find({
        roomId,
        status: 'confirmed',
        startTime: {$lt: dayEnd},
        endTime: {$gt: dayStart},
    }).select("startTime endTime").lean();

    const now = Date.now();
    const slots: { start: string; end: string; available: boolean }[] = [];

    
    for (let start = dayStart.getTime(); start + SLOT_MS <= dayEnd.getTime(); start += SLOT_MS){
        const end = start + SLOT_MS;

        const isBooked = bookings.some(
            (b) => b.startTime.getTime() < end && b.endTime.getTime() > start,
        );
        const hasStarted = start <= now;

        slots.push({
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            available: !isBooked && !hasStarted,
        });
    }

    return {roomId, date, slots};
}

export async function createNewRoom(input: CreateRoomInput){
    const { name, capacity, amenities, isActive} = input;
    
    try {
        const newRoom = await Room.create({
            roomName: name,
            capacity,
            amenities,
            isActive
        })
        
        return newRoom;
    } catch (error) {
        if(isDuplicateKey(error)) {
            throw ApiError.conflict("ROOM_NAME_TAKEN", "A room with this name already exists.");
        }
        throw error;
    }
    
}

export async function editRoomDetails(roomId: string, input: UpdateRoomInput){
    const update: Record<string, unknown> = {};
    const { name, amenities, capacity, isActive } = input;

    if (name !== undefined) update.roomName = name;
    if (amenities !== undefined) update.amenities = amenities;
    if (capacity !== undefined) update.capacity = capacity
    if (isActive !== undefined) update.isActive = isActive

    let room;
    try {
        room = await Room.findByIdAndUpdate(
            roomId,
            { $set: update },
            { returnDocument: 'after', runValidators: true}
        )
        
    } catch (error) {
        if(isDuplicateKey(error)) {
            throw ApiError.conflict("ROOM_NAME_TAKEN", "A room with this name already exists.");
        }
        throw error;
    }

    if(!room) {
        throw ApiError.notFound('Room not found.');
    }

    return room;
}

export async function removeRoom(roomId: string){
    const room = await Room.findById(roomId); 
    if(!room) {
        throw ApiError.notFound('Room not found.');
    }

    const futureBookings = await Booking.countDocuments({
        roomId,
        status: 'confirmed',
        startTime: { $gt: new Date() }
    });

    if(futureBookings > 0){
        throw ApiError.conflict(
            'ROOM_HAS_BOOKINGS', 
            'This room has upcoming bookings. Deactivate it instead of deleting it'
        );
    }

    await Room.deleteOne({ _id: roomId });

    return {message: "Room deleted"};
}

