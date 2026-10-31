import { z } from 'zod';

const roomFields = {
    name: z.string().trim().min(1).max(100),
    capacity: z.number().int().min(1).max(200),
    amenities: z.array(z.string()),
    isActive: z.boolean(),
};

export const createRoomSchema = z.object({
    ...roomFields,
    amenities: roomFields.amenities.default([]),
    isActive: roomFields.isActive.default(true),
});

export const updateRoomSchema = z
    .object(roomFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Send at least one field to update.',
    });

export const listRoomsQuerySchema = z.object({
    minCapacity: z.coerce.number().int().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const roomIdParamSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid room id.'),
});

export const availabilityQuerySchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
        .refine((value) => {
            const parsed = new Date(`${value}T00:00:00Z`);
            return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
        }, "Not a real date."),
});
  
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
export type RoomIdParam = z.infer<typeof roomIdParamSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
