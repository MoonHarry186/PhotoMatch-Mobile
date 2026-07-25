export function applyServerFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
  setFieldError: (field: string, message: string) => void,
): void {
  if (!fieldErrors) return;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const first = messages.find(Boolean);
    if (first) setFieldError(field, first);
  }
}
