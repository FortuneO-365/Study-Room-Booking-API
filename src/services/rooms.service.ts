import { Booking } from "../models/booking.model.js";
import { Room } from "../models/room.model.js";
import ApiError from "../utils/ApiError.js";
import type { CreateRoomInput, ListRoomsQuery, RoomIdParam, UpdateRoomInput } from "../validation/room.schema.js";

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

export async function getRoombyId(param: RoomIdParam, includeInactive = false ){
    
    const filter: Record<string, unknown> = { _id: roomId };
    if (!includeInactive) filter.isActive = true;

    const room = await Room.findOne(filter);
    if (!room) {
        throw ApiError.notFound("Room not found.");
    }

  return room;
}

export async function createNewRoom(input: CreateRoomInput){
    const { name, capacity, amenities, isActive} = input;
    
    const newRoom = await Room.create({
        roomName: name,
        capacity,
        amenities,
        isActive
    })
    
    return newRoom;
}

export async function editRoomDetails(roomId: string, input: UpdateRoomInput){
    const update: Record<string, unknown> = {};
    const { name, amenities, capacity, isActive } = input;

    if (name !== undefined) update.name = name;
    if (amenities !== undefined) update.amenities = amenities;
    if (capacity !== undefined) update.capacity = capacity
    if (isActive !== undefined) update.isActive = isActive

    const room = await Room.findByIdAndUpdate(
        roomId,
        { $set: update },
        { returnDocument: 'after', runValidators: true}
    )

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
            'ROOM_HAS_BOOKING', 
            'This room has upcoming bookings. Deactivate it instead of deleting it'
        );
    }

    await Room.deleteOne({ _id: roomId });

    return {message: "Room deleted"};
}

