import { z } from 'zod';

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(150, 'Email must not exceed 150 characters')
  .email('Invalid email address');

const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters');

const roleCreateSchema = z.enum(['teacher', 'student'], {
  errorMap: () => ({ message: 'Role must be teacher or student' }),
});

const classNameSchema = z
  .string()
  .trim()
  .max(50, 'Class name must not exceed 50 characters')
  .optional()
  .nullable()
  .transform((val) => (val === '' || val === undefined ? null : val));

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleCreateSchema,
  class_name: classNameSchema,
});

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    role: roleCreateSchema.optional(),
    class_name: classNameSchema,
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.role !== undefined ||
      data.class_name !== undefined,
    {
      message: 'At least one field is required to update',
    }
  );

const booleanQuerySchema = z.preprocess((val) => {
  if (val === undefined || val === '') return undefined;
  if (val === 'true' || val === '1' || val === 1 || val === true) return true;
  if (val === 'false' || val === '0' || val === 0 || val === false) return false;
  return val;
}, z.boolean().optional());

export const listQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  role: z.enum(['admin', 'teacher', 'student']).optional(),
  is_active: booleanQuerySchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const exportQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  role: z.enum(['admin', 'teacher', 'student']).optional(),
  is_active: booleanQuerySchema,
  delimiter: z.enum(['comma', 'semicolon']).default('comma'),
});

export default {
  createUserSchema,
  updateUserSchema,
  listQuerySchema,
  exportQuerySchema,
};
