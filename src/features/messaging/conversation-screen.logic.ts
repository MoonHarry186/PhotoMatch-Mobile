import type { Translate } from '@/i18n/i18n-provider';
import type { Locale } from '@/i18n/messages';

import { getMessageIdentity, type MessageView } from './messaging.types';

export type MessageListRow =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'message'; key: string; message: MessageView };

const DAY_IN_MS = 24 * 60 * 60 * 1_000;

export function buildMessageRows(
  messages: MessageView[],
  locale: Locale,
  t: Translate,
  now = new Date(),
): MessageListRow[] {
  const rows: MessageListRow[] = [];
  let previousDayKey: string | null = null;

  for (const message of messages) {
    // So sánh theo ngày địa phương, không theo timestamp đầy đủ.
    const sentAt = new Date(message.sentAt);
    const dayKey = localDayKey(sentAt);
    if (dayKey !== previousDayKey) {
      // Chỉ thêm một separator khi ngày thay đổi để tránh lặp trong cùng một ngày.
      rows.push({
        kind: 'date',
        key: `date:${dayKey}`,
        label: formatDayLabel(sentAt, now, locale, t),
      });
      previousDayKey = dayKey;
    }
    rows.push({
      kind: 'message',
      key: `message:${getMessageIdentity(message)}`,
      message,
    });
  }

  return rows;
}

function localDayKey(value: Date): string {
  if (Number.isNaN(value.getTime())) return 'unknown';
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDayLabel(
  value: Date,
  now: Date,
  locale: Locale,
  t: Translate,
): string {
  if (Number.isNaN(value.getTime())) return value.toString();
  const dayDifference = Math.round(
    (calendarDay(now) - calendarDay(value)) / DAY_IN_MS,
  );
  if (dayDifference === 0) return t('messaging.today');
  if (dayDifference === 1) return t('messaging.yesterday');
  return value.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calendarDay(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}
