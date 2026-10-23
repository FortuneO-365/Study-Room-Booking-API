import { z } from 'zod';

export const createRoomSchema = z.object({
    name: z.string().trim().min(1).max(100),
    capacity: z.number().int().min(1).max(200),
    amenities: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
});

export const updateRoomSchema = createRoomSchema
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

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
export type RoomIdParam = z.infer<typeof roomIdParamSchema>;
