export interface DiogelWindowMessage {
  id: string;
  type: string;
  method?: string;
  payload?: Record<string, unknown>;
}

export const getCurrentWindowOrigin = (): string => window.location.origin;

export const isSameWindowOrigin = (event: MessageEvent<unknown>): boolean =>
  event.origin === getCurrentWindowOrigin();

export const isDiogelWindowMessage = (value: unknown): value is DiogelWindowMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.type === 'string';
};
