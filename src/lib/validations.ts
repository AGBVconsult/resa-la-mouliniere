import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z
    .string()
    .min(2, 'error.validation.nameMin')
    .max(50, 'error.validation.nameMax'),
  lastName: z
    .string()
    .min(2, 'error.validation.nameMin')
    .max(50, 'error.validation.nameMax'),
  email: z
    .string()
    .email('error.validation.email'),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'error.validation.phone'),
});

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'error.validation.dateFormat');
