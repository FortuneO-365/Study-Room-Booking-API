import { z } from 'zod';

const SLOT_MS = 30 * 60 * 1000;
const MIN_DURATION_MS = 30 * 60 * 1000;
const MAX_DURATION_MS = 4 * 60 * 60 * 1000;

const utcDateTime = z.iso
    .datetime({ message: 'Use ISO 8601 UTC format, e.g. 2026-10-20T10:00:00Z.' })
    .transform((value) => new Date(value));

export const createBookingSchema = z
    .object({
        roomId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid room id.'),
        startTime: utcDateTime,
        endTime: utcDateTime,
        attendeeCount: z
            .number({ error: 'attendeeCount must be a number.' })
            .int('attendeeCount must be a whole number.')
            .min(1, 'At least 1 attendee is required.'),
        purpose: z
            .string()
            .trim()
            .max(200, 'Purpose must be 200 characters or fewer.')
            .optional(),
    })
    .refine((data) => data.endTime > data.startTime, {
        message: 'endTime must be after startTime.',
        path: ['endTime'],
    })
    .refine(
        (data) => {
        const duration = data.endTime.getTime() - data.startTime.getTime();
        return duration >= MIN_DURATION_MS && duration <= MAX_DURATION_MS;
        },
        {
        message: 'A booking must be between 30 minutes and 4 hours.',
        path: ['endTime'],
        },
    )
    .refine(
        (data) =>
        data.startTime.getTime() % SLOT_MS === 0 &&
        data.endTime.getTime() % SLOT_MS === 0,
        {
        message: 'Start and end times must fall on :00 or :30.',
        path: ['startTime'],
        },
    );

export const listMyBookingsQuerySchema = z.object({
    status: z.enum(['confirmed', 'cancelled']).optional(),
    // Query strings arrive as "true" or "false". Convert them explicitly,
    // because z.coerce.boolean() treats "false" as true.
    upcoming: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
    
export const bookingIdParamSchema = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking id.'),
});
    
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuerySchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>;