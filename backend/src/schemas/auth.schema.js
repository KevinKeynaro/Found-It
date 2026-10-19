import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .refine(
      (val) => Buffer.byteLength(val, 'utf8') <= 72,
      'Password must not exceed 72 bytes'
    ),
});

export const changePasswordSchema = z
  .object({
    current_password: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password cannot be empty'),
    new_password: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long')
      .refine(
        (val) => Buffer.byteLength(val, 'utf8') <= 72,
        'New password must not exceed 72 bytes'
      ),
  })
  .refine((data) => data.new_password !== data.current_password, {
    message: 'New password must be different from current password',
    path: ['new_password'],
  });
