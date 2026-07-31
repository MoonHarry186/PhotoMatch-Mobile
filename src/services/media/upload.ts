import {
  uploadsControllerComplete,
  uploadsControllerPresign,
} from '@/generated/api/sdk.gen';
import type { UploadAssetResponse } from '@/generated/api/types.gen';
import { createSubmissionKey } from '@/services/api/idempotency';
import { unwrap } from '@/services/api/result';

import {
  validateMedia,
  type MediaPurpose,
  type MediaSelection,
} from './media-policy';

export type UploadProgress = (value: number) => void;

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: UploadProgress;
};

export async function uploadMedia(
  purpose: MediaPurpose,
  input: MediaSelection,
  options: UploadOptions = {},
): Promise<UploadAssetResponse> {
  const selected = validateMedia(purpose, input);
  const onProgress = options.onProgress ?? (() => undefined);
  options.signal?.throwIfAborted();
  onProgress(0.05);

  const localResponse = await fetch(selected.uri, { signal: options.signal });
  if (!localResponse.ok) throw new Error('Không thể đọc tệp đã chọn.');
  const bytes = await localResponse.arrayBuffer();
  if (bytes.byteLength > policyMax(purpose)) {
    throw new Error('Tệp vượt quá giới hạn cho phép.');
  }
  options.signal?.throwIfAborted();
  onProgress(0.2);

  const presign = unwrap(
    await uploadsControllerPresign({
      body: {
        purpose,
        mimeType: selected.mimeType,
        extension: selected.extension,
        sizeBytes: bytes.byteLength,
      },
      signal: options.signal,
    }),
  );
  onProgress(0.35);

  const uploaded = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.requiredHeaders,
    body: bytes,
    signal: options.signal,
  });
  if (!uploaded.ok) throw new Error('Không thể tải tệp lên kho lưu trữ.');
  onProgress(0.8);

  const submission = createSubmissionKey();
  const asset = unwrap(
    await uploadsControllerComplete({
      path: { uploadId: presign.uploadId },
      headers: { 'Idempotency-Key': submission.current() },
      body: { checksum: '' },
      signal: options.signal,
    }),
  );
  submission.complete();
  onProgress(1);
  return asset;
}

function policyMax(purpose: MediaPurpose) {
  return purpose === 'CHAT_FILE' ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
}
