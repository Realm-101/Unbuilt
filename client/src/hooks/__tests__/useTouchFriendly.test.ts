import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTouchFriendly } from '../useTouchFriendly';

describe('useTouchFriendly', () => {
  let originalInnerWidth: number;
  let originalMaxTouchPoints: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalMaxTouchPoints = navigator.maxTouchPoints;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: originalMaxTouchPoints,
    });
  });

  it('should detect mobile viewport (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useTouchFriendly());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isSmallScreen).toBe(true);
  });

  it('should detect desktop viewport (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useTouchFriendly());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isSmallScreen).toBe(false);
  });

  it('should detect touch device', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 1,
    });

    const { result } = renderHook(() => useTouchFriendly());

    expect(result.current.isTouchDevice).toBe(true);
  });

  it('should update on window resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useTouchFriendly());

    expect(result.current.isMobile).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(true);
  });
});
