import { z } from 'zod';
import { todayInTimezone } from '../services/itemRules.js';
import itemsConfig from '../config/items.js';

const dateFoundSchema = z
  .string({ required_error: 'Date found is required' })
  .trim()
  .refine(
    (val) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
      const [year, month, day] = val.split('-').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      if (
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month - 1 ||
        d.getUTCDate() !== day
      ) {
        return false;
      }
      const today = todayInTimezone(new Date(), itemsConfig.appTimezone);
      return val <= today;
    },
    {
      message: 'Date found must be a valid calendar date (YYYY-MM-DD) and cannot be in the future.',
    }
  );

export const createItemSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  location_found: z
    .string({ required_error: 'Location found is required' })
    .trim()
    .min(1, 'Location cannot be empty')
    .max(150, 'Location cannot exceed 150 characters'),
  date_found: dateFoundSchema,
});

export const updateItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(150, 'Title cannot exceed 150 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  location_found: z
    .string()
    .trim()
    .min(1, 'Location cannot be empty')
    .max(150, 'Location cannot exceed 150 characters')
    .optional(),
  date_found: dateFoundSchema.optional(),
});

export const returnItemSchema = z.object({
  returned_to: z
    .string()
    .trim()
    .max(100, 'Recipient name cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const listQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  view: z.enum(['active', 'overdue', 'archive']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export default {
  createItemSchema,
  updateItemSchema,
  returnItemSchema,
  listQuerySchema,
};
