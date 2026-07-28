import { z } from 'zod';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const personalProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên hiển thị')
    .max(120, 'Tên hiển thị tối đa 120 ký tự'),
  dateOfBirth: z
    .string()
    .regex(isoDate, 'Ngày sinh cần có dạng YYYY-MM-DD')
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
    }, 'Bạn cần đủ 18 tuổi'),
  cityId: z.string().uuid('Vui lòng chọn thành phố'),
  bio: z.string().trim().max(1000, 'Giới thiệu tối đa 1000 ký tự'),
});

export const activityFieldsSchema = z.object({
  activityFieldIds: z
    .array(z.string().uuid())
    .min(1, 'Chọn ít nhất một lĩnh vực'),
});

const serviceSchema = z
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
        message: 'Dịch vụ cung cấp cần có giá tối thiểu và tối đa',
      });
    }
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Giá tối thiểu không được lớn hơn giá tối đa',
      });
    }
  });

export const servicesSchema = z.object({
  services: z.array(serviceSchema).min(1, 'Chọn ít nhất một dịch vụ'),
});

export type PersonalProfileForm = z.infer<typeof personalProfileSchema>;
export type ServicesForm = z.infer<typeof servicesSchema>;
