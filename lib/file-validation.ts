export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function validateFile(file: File, t?: Translate): FileValidationResult {
  // Optional translator: falls back to the original English messages when not provided.
  const msg = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : fallback;

  if (file.size === 0) {
    return { valid: false, error: msg('file.empty', 'The selected file is empty.') };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: msg('file.tooLarge', `File is ${sizeMB}MB. Maximum allowed size is 50MB.`, { size: sizeMB }) };
  }

  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return { valid: false, error: msg('file.badExt', `File type "${ext}" is not allowed. Only PDF, DOC, and DOCX files are accepted.`, { ext }) };
  }

  const detectedType = file.type || 'application/octet-stream';
  const knownMime = ALLOWED_MIME_TYPES.includes(detectedType as typeof ALLOWED_MIME_TYPES[number]);
  if (!knownMime && detectedType !== 'application/octet-stream') {
    return { valid: false, error: msg('file.badMime', `MIME type "${detectedType}" is not allowed. Only PDF, DOC, and DOCX files are accepted.`, { type: detectedType }) };
  }

  // Check for suspicious path characters
  if (/[<>:"|?*\x00-\x1f]/.test(file.name)) {
    return { valid: false, error: msg('file.badName', 'Filename contains invalid characters.') };
  }

  if (file.name.length > 255) {
    return { valid: false, error: msg('file.nameTooLong', 'Filename is too long (maximum 255 characters).') };
  }

  return { valid: true };
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
