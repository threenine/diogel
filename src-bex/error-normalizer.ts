export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;

    if (typeof candidate.message === 'string') {
      return candidate.message;
    }

    if (typeof candidate.error === 'string') {
      return candidate.error;
    }

    if (candidate.error && typeof candidate.error === 'object') {
      const nested = candidate.error as Record<string, unknown>;
      if (typeof nested.message === 'string') {
        return nested.message;
      }
    }

    if (typeof candidate.code === 'string') {
      return candidate.code;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return String(error);
}
