let localCounter = 0;

function randomHex(byteLength: number): string {
  const values = new Uint8Array(byteLength);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function createId(prefix: string): string {
  localCounter = (localCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now()}_${randomHex(8)}_${localCounter.toString(36)}`;
}
