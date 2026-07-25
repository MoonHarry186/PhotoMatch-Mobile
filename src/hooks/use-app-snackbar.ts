import { useFeedback } from '@/providers/app-feedback-provider';

export function useAppSnackbar() {
  return useFeedback();
}
