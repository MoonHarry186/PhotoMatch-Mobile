export type MediaPurpose =
  'AVATAR' | 'PORTFOLIO' | 'CHAT_IMAGE' | 'CHAT_FILE' | 'REPORT_EVIDENCE';

export type MediaSelection = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

export type MediaPolicy = {
  maxBytes: number;
  mimeTypes: readonly string[];
  extensions: readonly string[];
};

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'] as const;

export const MEDIA_POLICIES: Record<MediaPurpose, MediaPolicy> = {
  AVATAR: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: imageTypes,
    extensions: imageExtensions,
  },
  PORTFOLIO: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: imageTypes,
    extensions: imageExtensions,
  },
  CHAT_IMAGE: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: imageTypes,
    extensions: imageExtensions,
  },
  CHAT_FILE: {
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/vnd.openxmlformats-officedocument.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['pdf', 'txt', 'zip', 'doc', 'docx'],
  },
  REPORT_EVIDENCE: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: [...imageTypes, 'application/pdf'],
    extensions: [...imageExtensions, 'pdf'],
  },
};

export type MediaPolicyErrorCode =
  | 'MEDIA_URI_REQUIRED'
  | 'MEDIA_MIME_NOT_ALLOWED'
  | 'MEDIA_EXTENSION_NOT_ALLOWED'
  | 'MEDIA_TOO_LARGE';

export class MediaPolicyError extends Error {
  readonly code: MediaPolicyErrorCode;

  constructor(code: MediaPolicyErrorCode, message: string) {
    super(message);
    this.name = 'MediaPolicyError';
    this.code = code;
  }
}

function fileExtension(input: MediaSelection) {
  const name = input.fileName?.split('/').pop() ?? '';
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export function validateMedia(
  purpose: MediaPurpose,
  input: MediaSelection,
): MediaSelection & { mimeType: string; extension: string } {
  const policy = MEDIA_POLICIES[purpose];
  if (!input.uri) {
    throw new MediaPolicyError(
      'MEDIA_URI_REQUIRED',
      'Không tìm thấy tệp đã chọn.',
    );
  }
  const mimeType = input.mimeType?.toLowerCase() || 'application/octet-stream';
  if (!policy.mimeTypes.includes(mimeType)) {
    throw new MediaPolicyError(
      'MEDIA_MIME_NOT_ALLOWED',
      `Định dạng ${mimeType} không được hỗ trợ cho loại tệp này.`,
    );
  }
  const extension = fileExtension(input);
  if (extension && !policy.extensions.includes(extension)) {
    throw new MediaPolicyError(
      'MEDIA_EXTENSION_NOT_ALLOWED',
      'Phần mở rộng tệp không khớp với chính sách tải lên.',
    );
  }
  if (
    input.fileSize !== undefined &&
    input.fileSize !== null &&
    input.fileSize > policy.maxBytes
  ) {
    throw new MediaPolicyError(
      'MEDIA_TOO_LARGE',
      `Tệp vượt quá giới hạn ${Math.round(policy.maxBytes / 1024 / 1024)} MB.`,
    );
  }
  return {
    ...input,
    mimeType,
    extension: extension || defaultExtension(mimeType),
  };
}

function defaultExtension(mimeType: string) {
  return mimeType === 'image/jpeg'
    ? 'jpg'
    : mimeType.split('/').pop()?.split('+')[0] || 'bin';
}
