import { describe, it, expect } from 'vitest';

import {
  classifyRequest,
  ELEVATED_EVENT_KINDS,
  formatEventFields,
  getAllowedDurations,
  getEventKindLabel,
  getRequestTypeLabel,
  getRiskWarning,
  shouldDefaultToFullEvent,
  truncateForPreview,
} from 'src/services/approval-preview';

describe('approval preview rules', () => {
  describe('classification (D12)', () => {
    it('treats known ordinary kinds as standard', () => {
      expect(classifyRequest('sign_event', 1)).toBe('standard');
      expect(classifyRequest('sign_event', 7)).toBe('standard');
    });

    it('treats the elevated kinds as elevated', () => {
      for (const kind of ELEVATED_EVENT_KINDS) {
        expect(classifyRequest('sign_event', kind)).toBe('elevated');
      }
    });

    it('treats an unrecognised kind as unknown', () => {
      expect(classifyRequest('sign_event', 31337)).toBe('unknown');
    });

    it('treats payment requests as payments whatever their kind', () => {
      expect(classifyRequest('webln_send_payment', -1)).toBe('payment');
      expect(classifyRequest('send_zap', 9734)).toBe('payment');
    });

    it('does not treat the no-kind sentinel as an unknown kind', () => {
      // -1 means "this request has no event kind", not "any kind" and not "unrecognised".
      expect(classifyRequest('get_public_key', -1)).toBe('standard');
    });
  });

  describe('grant options (D11, D12)', () => {
    it('offers all three durations for a standard request', () => {
      expect(getAllowedDurations('standard', true)).toEqual(['once', '8h', 'always']);
    });

    it('never offers always for an elevated kind', () => {
      expect(getAllowedDurations('elevated', true)).toEqual(['once', '8h']);
    });

    it('offers only once for an unknown kind', () => {
      expect(getAllowedDurations('unknown', true)).toEqual(['once']);
    });

    it('offers only once for a payment, even when remembering is allowed', () => {
      expect(getAllowedDurations('payment', true)).toEqual(['once']);
    });

    it('offers only once when the request forbids remembering', () => {
      expect(getAllowedDurations('standard', false)).toEqual(['once']);
    });
  });

  describe('warnings', () => {
    it('names the specific effect for an elevated kind', () => {
      expect(getRiskWarning('elevated', 5)).toContain('deletion');
      expect(getRiskWarning('elevated', 3)).toContain('follow');
      expect(getRiskWarning('elevated', 22242)).toContain('identity');
    });

    it('tells the user to read the full event for an unknown kind', () => {
      expect(getRiskWarning('unknown', 31337)).toContain('full event');
    });

    it('says nothing for a standard request', () => {
      expect(getRiskWarning('standard', 1)).toBeUndefined();
    });

    it('opens on the full event only for unknown kinds', () => {
      expect(shouldDefaultToFullEvent('unknown')).toBe(true);
      expect(shouldDefaultToFullEvent('standard')).toBe(false);
      expect(shouldDefaultToFullEvent('elevated')).toBe(false);
    });
  });

  describe('labels', () => {
    it('labels known request types and falls back safely', () => {
      expect(getRequestTypeLabel('sign_event')).toBe('Sign event request');
      expect(getRequestTypeLabel('something_new')).toBe('Signer request');
    });

    it('marks an unrecognised kind as unrecognised rather than inventing a name', () => {
      expect(getEventKindLabel(1)).toBe('Text note (1)');
      expect(getEventKindLabel(31337)).toContain('Unrecognised');
      expect(getEventKindLabel(-1)).toBe('No Nostr event kind');
    });
  });

  describe('truncation', () => {
    it('leaves short content alone', () => {
      const result = truncateForPreview('short');
      expect(result).toEqual({ text: 'short', truncated: false, fullLength: 5 });
    });

    it('reports truncation rather than hiding it', () => {
      const content = 'x'.repeat(700);
      const result = truncateForPreview(content);
      expect(result.truncated).toBe(true);
      expect(result.fullLength).toBe(700);
      expect(result.text).toHaveLength(600);
    });
  });

  describe('formatted fields', () => {
    it('summarises the meaningful fields without exposing raw content', () => {
      const fields = formatEventFields({
        kind: 1,
        content: 'hello world',
        created_at: 1_700_000_000,
        tags: [
          ['p', 'abc'],
          ['e', 'def'],
        ],
      });

      const labels = fields.map((field) => field.label);
      expect(labels).toContain('Kind');
      expect(labels).toContain('Mentions');
      expect(labels).toContain('References events');
      expect(JSON.stringify(fields)).not.toContain('hello world');
    });
  });
});
