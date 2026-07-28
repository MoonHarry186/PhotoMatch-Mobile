import type {
  PortfolioItemResponse,
  PublicProfileResponse,
  ReviewCollectionResponse,
} from '@/generated/api/types.gen';

export type PublicProfileViewModel = PublicProfileResponse;
export type PortfolioItemViewModel = PortfolioItemResponse;
export type ReviewPage = ReviewCollectionResponse;

export type PortfolioDraft = {
  title: string;
  description: string;
  serviceId?: string;
};

export function portfolioEligibility(count: number) {
  return {
    count,
    required: 6,
    eligible: count >= 6,
    message:
      count >= 6
        ? 'Portfolio đã đạt tối thiểu 6 ảnh.'
        : `Thêm ${6 - count} ảnh để đủ điều kiện xuất hiện trong Khám phá.`,
  };
}
