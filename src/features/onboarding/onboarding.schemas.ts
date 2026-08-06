import { z } from 'zod';

import type { Translate } from '@/i18n/i18n-provider';
import { messages, type MessageKey } from '@/i18n/messages';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const vi = (key: MessageKey) => messages.vi[key];

export const createPersonalProfileSchema = (t: Translate) =>
  z.object({
    displayName: z
      .string()
      .trim()
      .min(1, t('onboarding.validation.displayNameRequired'))
      .max(120, t('onboarding.validation.displayNameMax')),
    dateOfBirth: z
      .string()
      .regex(isoDate, t('onboarding.validation.birthDateFormat'))
      .refine((value) => {
        const birth = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(birth.getTime())) return false;
        const today = new Date();
        let age = today.getUTCFullYear() - birth.getUTCFullYear();
        const beforeBirthday =
          today.getUTCMonth() < birth.getUTCMonth() ||
          (today.getUTCMonth() === birth.getUTCMonth() &&
            today.getUTCDate() < birth.getUTCDate());
        if (beforeBirthday) age -= 1;
        return age >= 18;
      }, t('onboarding.validation.adultRequired')),
    cityId: z.string().uuid(t('onboarding.validation.cityRequired')),
    bio: z.string().trim().max(1000, t('onboarding.validation.bioMax')),
  });

export const personalProfileSchema = createPersonalProfileSchema(vi);

export const createActivityFieldsSchema = (t: Translate) =>
  z.object({
    activityFieldIds: z
      .array(z.string().uuid())
      .min(1, t('onboarding.validation.activityRequired')),
  });

export const activityFieldsSchema = createActivityFieldsSchema(vi);

const createServiceSchema = (t: Translate) =>
  z
    .object({
      serviceId: z.string().uuid(),
      serviceMode: z.enum(['OFFERED', 'WANTED']),
      minPrice: z.number().nonnegative().optional(),
      maxPrice: z.number().nonnegative().optional(),
      priceUnit: z.string().trim().max(40).optional(),
    })
    .superRefine((value, context) => {
      if (
        value.serviceMode === 'OFFERED' &&
        (value.minPrice === undefined || value.maxPrice === undefined)
      ) {
        context.addIssue({
          code: 'custom',
          message: t('onboarding.validation.servicePricingRequired'),
        });
      }
      if (
        value.minPrice !== undefined &&
        value.maxPrice !== undefined &&
        value.minPrice > value.maxPrice
      ) {
        context.addIssue({
          code: 'custom',
          message: t('onboarding.validation.priceRange'),
        });
      }
    });

export const createServicesSchema = (t: Translate) =>
  z.object({
    services: z
      .array(createServiceSchema(t))
      .min(1, t('onboarding.validation.serviceRequired')),
  });

export const servicesSchema = createServicesSchema(vi);

export type PersonalProfileForm = z.infer<typeof personalProfileSchema>;
export type ServicesForm = z.infer<typeof servicesSchema>;
