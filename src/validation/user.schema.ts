import { email, z } from 'zod';

const emailSchema = z
    .email()
    .trim()
    .toLowerCase()
    .max(254);

const passwordSchema = z
    .string({ error: 'Password is required'})
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at 72 characters or less');

export const registerSchema = z.object({
    name: z
        .string({error: 'Name is required'})
        .trim()
        .min(2, 'Names have at least 2 letters')
        .max(120, 'Name must be 120 characters or fewer'),
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
