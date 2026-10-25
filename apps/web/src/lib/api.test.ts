import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

const respond = (status: number, json: () => Promise<unknown>) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json }));

describe('api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('treats a success whose body was cut off as an unknown outcome, not as a success', async () => {
    respond(201, () => Promise.reject(new TypeError('network error')));

    await expect(api('/wallet/deposits', { method: 'POST', json: {} })).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('turns an error body into its code', async () => {
    respond(422, () => Promise.resolve({ code: 'DEPOSIT_DECLINED', message: 'no' }));

    await expect(api('/wallet/deposits')).rejects.toMatchObject({ status: 422, code: 'DEPOSIT_DECLINED' });
  });

  it('keeps the status when an error has no readable body', async () => {
    respond(502, () => Promise.reject(new SyntaxError('Unexpected token <')));

    await expect(api('/wallet')).rejects.toMatchObject({ status: 502, code: 'INTERNAL' });
  });
});
