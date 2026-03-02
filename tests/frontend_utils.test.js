const ensureString = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
};

const safeRender = (val, fallback = "") => {
  const s = ensureString(val, fallback);
  return s === "" ? fallback : s;
};

describe('Frontend Utils Logic', () => {
  describe('ensureString', () => {
    it('returns string as is', () => {
      expect(ensureString('hello')).toBe('hello');
    });
    it('returns stringified object', () => {
      expect(ensureString({ a: 1 })).toBe('{"a":1}');
    });
    it('returns empty string for null/undefined', () => {
      expect(ensureString(null)).toBe('');
      expect(ensureString(undefined)).toBe('');
    });
    it('returns custom fallback', () => {
      expect(ensureString(null, 'none')).toBe('none');
    });
  });

  describe('safeRender', () => {
    it('returns string as is', () => {
      expect(safeRender('hello')).toBe('hello');
    });
    it('returns stringified object', () => {
      expect(safeRender({ a: 1 })).toBe('{"a":1}');
    });
    it('returns fallback for null/undefined', () => {
      expect(safeRender(null, 'none')).toBe('none');
    });
  });
});
