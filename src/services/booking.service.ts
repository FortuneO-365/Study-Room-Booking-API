import { env } from "../config/env.js";
import { Booking } from "../models/booking.model.js";
import { Room } from "../models/room.model.js";
import ApiError from "../utils/ApiError.js";
import type { CreateBookingInput } from "../validation/booking.schema.js";

export interface ListMyBookingsQuery {
    status?: "confirmed" | "cancelled";
    upcoming?: boolean;
    page: number;
    limit: number;
}
  
  // Returns the minutes since midnight for a date, in the building's time zone
function minutesOfDayIn(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);
    return hour * 60 + minute;
}
  
export async function getMyBookings(userId: string, query: ListMyBookingsQuery) {
    const { status, upcoming, page, limit } = query;

    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;
    if (upcoming) filter.startTime = { $gt: new Date() };

    const [data, total] = await Promise.all([
        Booking.find(filter)
            .sort({ startTime: -1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Booking.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
}
  
export async function createNewBooking(userId: string, input: CreateBookingInput) {
    const { roomId, startTime, endTime, attendeeCount, purpose } = input;
    const now = new Date();
  
    if (startTime <= now) {
        throw ApiError.badRequest("VALIDATION_ERROR", "Bookings must start in the future.");
    }
  
    const room = await Room.findOne({ _id: roomId, isActive: true });
    if (!room) {
        throw ApiError.notFound("Room not found.");
    }
  
    if (attendeeCount > room.capacity) {
        throw ApiError.badRequest(
            "VALIDATION_ERROR",
            `This room holds up to ${room.capacity} people.`,
        );
    }
  
    const tz = env.buildingTimezone;
    const openMin = env.openingHour * 60;
    const closeMin = env.closingHour * 60;
    const startMin = minutesOfDayIn(startTime, tz);
    let endMin = minutesOfDayIn(endTime, tz);
    if (endMin === 0) endMin = 24 * 60; 
  
    if (endMin <= startMin) {
        throw ApiError.badRequest("OUTSIDE_OPENING_HOURS", "Bookings cannot cross midnight.");
    }
    if (startMin < openMin || endMin > closeMin) {
        throw ApiError.badRequest(
            "OUTSIDE_OPENING_HOURS",
            `Bookings must be between ${env.openingHour}:00 and ${env.closingHour}:00.`,
        );
    }
  
    const futureCount = await Booking.countDocuments({
        userId,
        status: "confirmed",
        startTime: { $gt: now },
    });
    if (futureCount >= env.maxFutureBookings) {
        throw ApiError.badRequest(
            "BOOKING_LIMIT_REACHED",
            `You can hold up to ${env.maxFutureBookings} future bookings at a time.`,
        );
    }
  
    const overlap = await Booking.exists({
        roomId,
        status: "confirmed",
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    });
    if (overlap) {
        throw ApiError.conflict(
            "BOOKING_CONFLICT",
            "The requested time overlaps an existing booking.",
        );
    }
  
    const newBooking = await Booking.create({
        userId,
        roomId,
        startTime,
        endTime,
        attendeeCount,
        status: "confirmed",
        ...(purpose !== undefined && { purpose }),
    });
  
    return newBooking;
}
  
export async function cancelCreatedBooking(
    bookingId: string,
    actor: { id: string; role: string },
) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw ApiError.notFound("Booking not found.");
    }
  
    const isOwner = booking.userId.toString() === actor.id;
    if (!isOwner && actor.role !== "admin") {
        throw new ApiError(403, "FORBIDDEN", "You can only cancel your own bookings.");
    }
  
    if (booking.status === "cancelled") {
        throw ApiError.conflict("BOOKING_ALREADY_CANCELLED", "This booking is already cancelled.");
    }
  
    if (booking.startTime <= new Date()) {
        throw ApiError.badRequest("BOOKING_ALREADY_STARTED", "This booking has already started.");
    }
  
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();
  
    return booking;
}