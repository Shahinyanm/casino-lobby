/** crypto.randomUUID exists only in secure contexts; a phone on http://192.168.x.x has getRandomValues only. */
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
