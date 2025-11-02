/**
 * Haptic Feedback Utilities
 * 
 * Provides haptic feedback for touch interactions on supported devices.
 * Falls back gracefully on devices without haptic support.
 */

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Trigger light haptic feedback (for button taps, selections)
 */
export function hapticLight(): void {
  if (isHapticSupported()) {
    navigator.vibrate(10);
  }
}

/**
 * Trigger medium haptic feedback (for confirmations, toggles)
 */
export function hapticMedium(): void {
  if (isHapticSupported()) {
    navigator.vibrate(20);
  }
}

/**
 * Trigger heavy haptic feedback (for errors, important actions)
 */
export function hapticHeavy(): void {
  if (isHapticSupported()) {
    navigator.vibrate(30);
  }
}

/**
 * Trigger success haptic pattern
 */
export function hapticSuccess(): void {
  if (isHapticSupported()) {
    navigator.vibrate([10, 50, 10]);
  }
}

/**
 * Trigger error haptic pattern
 */
export function hapticError(): void {
  if (isHapticSupported()) {
    navigator.vibrate([30, 50, 30]);
  }
}

/**
 * Trigger selection haptic feedback (for swipes, drags)
 */
export function hapticSelection(): void {
  if (isHapticSupported()) {
    navigator.vibrate(5);
  }
}

/**
 * Custom haptic pattern
 * @param pattern - Array of vibration durations in milliseconds
 */
export function hapticCustom(pattern: number[]): void {
  if (isHapticSupported()) {
    navigator.vibrate(pattern);
  }
}
