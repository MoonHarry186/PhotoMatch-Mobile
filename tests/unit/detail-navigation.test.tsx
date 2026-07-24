import { fireEvent, render } from '@testing-library/react-native';

import { DetailScreen } from '@/features/navigation/detail-screen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe('detail navigation fallback', () => {
  beforeEach(() => mockBack.mockClear());

  it('offers safe back behavior for valid details', async () => {
    const view = await render(
      <DetailScreen
        entity="Booking"
        id="11111111-1111-4111-8111-111111111111"
      />,
    );
    await fireEvent.press(view.getByText('Quay lại'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid identifier without rendering private data', async () => {
    const view = await render(<DetailScreen entity="Booking" id="invalid" />);
    expect(view.getByText('Liên kết không hợp lệ')).toBeTruthy();
  });
});
