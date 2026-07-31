import {
  bookingsControllerBookingReview,
  bookingsControllerCreate,
  bookingsControllerCreateReview,
  bookingsControllerDetail,
  bookingsControllerList,
  bookingsControllerPhotographerReviews,
  bookingsControllerTransition,
  bookingsControllerUpdate,
} from '@/generated/api/sdk.gen';
import type {
  BookingPage,
  BookingResponse,
  BookingStatusDto,
  CreateBookingDto,
  CreateReviewDto,
  ReviewCollectionResponse,
} from '@/generated/api/types.gen';
import { unwrap } from '@/services/api/result';

export function validateReviewInput(rating: number, comment?: string) {
  return (
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5 &&
    (comment === undefined || comment.length <= 2_000)
  );
}

export const bookingApi = {
  async list(
    query: {
      cursor?: string;
      limit?: number;
      status?: BookingStatusDto['status'];
      dateFrom?: string;
      dateTo?: string;
    },
    signal?: AbortSignal,
  ) {
    const page: BookingPage = unwrap(
      await bookingsControllerList({ query, signal }),
    );
    return { items: page.items, nextCursor: page.nextCursor ?? undefined };
  },
  async detail(
    bookingId: string,
    signal?: AbortSignal,
  ): Promise<BookingResponse> {
    return unwrap(
      await bookingsControllerDetail({ path: { bookingId }, signal }),
    );
  },
  async create(input: CreateBookingDto, idempotencyKey: string) {
    return unwrap(
      await bookingsControllerCreate({
        headers: { 'Idempotency-Key': idempotencyKey },
        body: input,
      }),
    );
  },
  async update(bookingId: string, input: Partial<CreateBookingDto>) {
    return unwrap(
      await bookingsControllerUpdate({ path: { bookingId }, body: input }),
    );
  },
  async transition(
    bookingId: string,
    status: Parameters<typeof bookingsControllerTransition>[0]['body'],
    idempotencyKey: string,
  ) {
    return unwrap(
      await bookingsControllerTransition({
        path: { bookingId },
        headers: { 'Idempotency-Key': idempotencyKey },
        body: status,
      }),
    );
  },
  async review(bookingId: string, signal?: AbortSignal) {
    return unwrap(
      await bookingsControllerBookingReview({ path: { bookingId }, signal }),
    );
  },
  async createReview(
    bookingId: string,
    input: CreateReviewDto,
    idempotencyKey: string,
  ) {
    return unwrap(
      await bookingsControllerCreateReview({
        path: { bookingId },
        headers: { 'Idempotency-Key': idempotencyKey },
        body: input,
      }),
    );
  },
  async photographerReviews(
    roleId: string,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<ReviewCollectionResponse> {
    return unwrap(
      await bookingsControllerPhotographerReviews({
        path: { photographerRoleId: roleId },
        query: { cursor, limit: 10 },
        signal,
      }),
    );
  },
};
