import { z } from 'zod';

import type { Translate } from '@/i18n/i18n-provider';
import { messages, type MessageKey } from '@/i18n/messages';

const vi = (key: MessageKey) => messages.vi[key];

export const createEmailSchema = (t: Translate) =>
  z
    .email(t('auth.validation.emailInvalid'))
    .transform((value) => value.toLowerCase());

export const createPasswordSchema = (t: Translate) =>
  z
    .string()
    .min(12, t('auth.validation.passwordMin'))
    .regex(/[a-z]/, t('auth.validation.passwordLowercase'))
    .regex(/[A-Z]/, t('auth.validation.passwordUppercase'))
    .regex(/[0-9]/, t('auth.validation.passwordNumber'));

export const createSignInSchema = (t: Translate) =>
  z.object({
    email: createEmailSchema(t),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  });

export const createSignUpSchema = (t: Translate) =>
  z
    .object({
      email: createEmailSchema(t),
      password: createPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ['confirmPassword'],
      message: t('auth.validation.passwordMismatch'),
    });

export const createVerificationOtpSchema = (t: Translate) =>
  z.string().regex(/^\d{6}$/, t('auth.validation.otpLength'));

export const createResetPasswordSchema = (t: Translate) =>
  z
    .object({
      resetToken: z.string().min(1),
      newPassword: createPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ['confirmPassword'],
      message: t('auth.validation.passwordMismatch'),
    });

export const emailSchema = createEmailSchema(vi);
export const passwordSchema = createPasswordSchema(vi);
export const signInSchema = createSignInSchema(vi);
export const signUpSchema = createSignUpSchema(vi);
export const verificationOtpSchema = createVerificationOtpSchema(vi);
export const resetPasswordSchema = createResetPasswordSchema(vi);
