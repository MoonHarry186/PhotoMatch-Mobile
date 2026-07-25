# Hệ thống xử lý lỗi PhotoMatch Mobile

## Luồng kiến trúc

```text
fetch/generated SDK/runtime error
  → normalizeError
  → AppError (code chuẩn + businessCode)
  → Query hoặc feature quyết định UI
  → reportError chỉ nhận lỗi unexpected
```

`AppError.code` dùng để phân loại kỹ thuật ổn định. Mã nghiệp vụ backend như
`BOOKING_TIME_UNAVAILABLE` được giữ trong `businessCode`; feature không phân
nhánh theo `message`.

## Quy tắc UI

| Trường hợp                 | Component                                          |
| -------------------------- | -------------------------------------------------- |
| Lỗi field                  | `InlineError`, hoặc truyền `error` vào `TextField` |
| Action nhỏ thất bại        | `showSnackbar`                                     |
| Trạng thái kéo dài         | `AppBanner`                                        |
| Mất kết nối                | `OfflineBanner` toàn app                           |
| Không có dữ liệu hữu ích   | `ErrorState`                                       |
| Xác nhận nguy hiểm         | `AppDialog`                                        |
| Conflict có nhiều lựa chọn | `ActionBottomSheet`                                |
| Render crash cục bộ        | `FeatureErrorBoundary`                             |
| Tin nhắn lỗi               | `MessageBubble status="failed"`                    |
| Ảnh upload lỗi             | `UploadThumbnail status="failed"`                  |

## Inline validation

```tsx
const error = normalizeError(caught);
applyServerFieldErrors(error.fieldErrors, (field, message) => {
  setError(field as keyof Form, { message });
});
```

`TextField` tự hiển thị `InlineError` ngay dưới input và cung cấp
`accessibilityRole="alert"`.

## Snackbar

```tsx
const { showSnackbar } = useAppSnackbar();

showSnackbar({
  message: 'Không thể lưu thay đổi',
  actionLabel: 'Thử lại',
  onAction: retry,
});
```

Toàn ứng dụng chỉ mount một Snackbar host. Snackbar mới thay Snackbar đang chờ,
không tạo nhiều lớp thông báo.

## Banner

```tsx
<AppBanner
  visible={maintenance}
  title="Hệ thống đang bảo trì"
  message="Một số tính năng tạm thời không khả dụng."
  actions={[{ label: 'Kiểm tra lại', onPress: refresh }]}
/>
```

`OfflineBanner` được mount trong `AppFeedbackProvider`, tự ẩn khi NetInfo báo
kết nối đã phục hồi.

## ErrorState

```tsx
if (query.isError && !query.data) {
  return (
    <ErrorState
      title="Không thể tải hồ sơ"
      primaryActionLabel="Thử lại"
      onPrimaryAction={() => void query.refetch()}
    />
  );
}
```

Khi query vẫn có cache, giữ nội dung cũ và dùng Snackbar/Banner thay vì
`ErrorState`.

## Dialog

```tsx
<AppDialog
  visible={confirming}
  title="Hủy lịch chụp?"
  description="Thao tác này có thể ảnh hưởng đến photographer."
  confirmLabel="Hủy lịch"
  destructive
  loading={mutation.isPending}
  onConfirm={confirm}
  onCancel={close}
/>
```

Dialog khóa dismiss và double-submit khi `loading`.

## ActionBottomSheet và booking conflict

```tsx
const error = normalizeError(caught);
if (isBookingConflict(error)) setConflict(error);

<BookingConflictSheet
  error={conflict}
  onChooseAnotherTime={openTimePicker}
  onFindAnotherPhotographer={openDiscovery}
  onDismiss={() => setConflict(null)}
/>;
```

Business code nằm trong feature booking, không nằm trong global error handler.
Project chưa cài `@gorhom/bottom-sheet`; implementation MVP dùng Modal, safe
area và danh sách action có accessibility.

## Chat message failed

```tsx
<MessageBubble
  content={message.content}
  time={message.time}
  status={message.status}
  onRetry={() => retryMessage(message.id)}
/>
```

Retry giữ nguyên ID/nội dung của optimistic message; state do feature quản lý
chuyển từ `failed` về `sending`, không tạo item mới.

## Image upload failed

```tsx
<UploadThumbnail
  uri={upload.localUri}
  status={upload.status}
  progress={upload.progress}
  onRetry={() => retryUpload(upload.id)}
  onRemove={() => removeUpload(upload.id)}
/>
```

Thumbnail local luôn được giữ. Lỗi và retry nằm ngay trên đúng ảnh.

## Refresh token

`fetchWithAuthRefresh` thực hiện:

1. Gửi request với access token trong memory.
2. Khi nhận 401, gọi `refreshAccessToken`.
3. Các request 401 đồng thời chờ cùng một Promise.
4. Refresh thành công thì mỗi request chạy lại đúng một lần.
5. Refresh thất bại terminal thì `SessionProvider` xóa session local.
6. Endpoint sign-in, OAuth và refresh không kích hoạt refresh đệ quy.

## Query policy

- GET chỉ retry `NETWORK_ERROR` hoặc `SERVER_ERROR`, tối đa hai lần.
- Mutation mặc định không retry.
- `QueryCache.onError` chỉ report unexpected error và query context.
- Global cache không tự show Snackbar.
- Background refetch lỗi không xóa cache.

## Reporting

```tsx
reportError(error, {
  route,
  feature: 'booking',
  requestId,
});
```

Development ghi stack bằng `console.error`. Production gửi unexpected error
đến Sentry nếu có DSN. Context được lọc token, password, OTP, nội dung chat,
tọa độ, URL ảnh ký, dữ liệu định danh và thanh toán.
