export const ROLES = ['student', 'admin'] as const;
export type Role = (typeof ROLES)[number];