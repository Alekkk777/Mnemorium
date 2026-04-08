/**
 * imageUtils.test.ts
 * Tests for pure image utility functions.
 * is360Image: accepts ratio 1.7–2.3 (equirectangular panoramas are ~2:1)
 */
import { describe, it, expect } from 'vitest';
import { is360Image } from '@/lib/imageUtils';

describe('is360Image', () => {
  it('detects classic 2:1 panoramas as 360', () => {
    expect(is360Image(4096, 2048)).toBe(true);
    expect(is360Image(8192, 4096)).toBe(true);
    expect(is360Image(2048, 1024)).toBe(true);
    expect(is360Image(1920, 960)).toBe(true);
  });

  it('accepts ratio ≥ 1.7 (wide enough for panorama)', () => {
    // ratio = 1.8
    expect(is360Image(1800, 1000)).toBe(true);
    // ratio ≈ 1.78 (16:9 — within the 1.7-2.3 range)
    expect(is360Image(1920, 1080)).toBe(true);
  });

  it('accepts ratio up to 2.3', () => {
    // ratio exactly 2.3
    expect(is360Image(2300, 1000)).toBe(true);
  });

  it('rejects ratio < 1.7', () => {
    // 4:3 = 1.333
    expect(is360Image(800, 600)).toBe(false);
    // square
    expect(is360Image(1000, 1000)).toBe(false);
    // portrait
    expect(is360Image(600, 800)).toBe(false);
  });

  it('rejects ratio > 2.3', () => {
    // very wide
    expect(is360Image(3000, 1000)).toBe(false);
  });

  it('handles zero dimensions without throwing', () => {
    expect(is360Image(0, 0)).toBe(false);
    expect(is360Image(1000, 0)).toBe(false);
  });
});
