import type { Locale } from '@/i18n/messages';

const localeTag = (locale: Locale) => (locale === 'vi' ? 'vi-VN' : 'en-US');

export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatPrice(
  value: number,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRating(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatApproximateDistance(
  meters: number,
  locale: Locale,
): string {
  if (meters < 1000)
    return locale === 'vi' ? 'Cách dưới 1 km' : 'Less than 1 km away';
  const km = Math.round(meters / 1000);
  return locale === 'vi' ? `Cách khoảng ${km} km` : `About ${km} km away`;
}
