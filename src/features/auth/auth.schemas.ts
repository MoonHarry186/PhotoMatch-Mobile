import { z } from 'zod';

export const emailSchema = z
  .email('Email không hợp lệ')
  .transform((value) => value.toLowerCase());
export const passwordSchema = z
  .string()
  .min(12, 'Mật khẩu phải có ít nhất 12 ký tự')
  .regex(/[a-z]/, 'Cần ít nhất một chữ thường')
  .regex(/[A-Z]/, 'Cần ít nhất một chữ hoa')
  .regex(/[0-9]/, 'Cần ít nhất một chữ số');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export const verificationOtpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Mã OTP phải gồm đúng 6 chữ số');

export const resetPasswordSchema = z
  .object({
    resetToken: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });
