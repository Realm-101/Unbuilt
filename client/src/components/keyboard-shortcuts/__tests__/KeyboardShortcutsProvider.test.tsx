import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsProvider } from '../KeyboardShortcutsProvider';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Mock the hook
vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

describe('KeyboardShortcutsProvider', () => {
  const mockRegisterShortcut = vi.fn();
  const mockUnregisterShortcut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useKeyboardShortcuts as any).mockReturnValue({
      registerShortcut: mockRegisterShortcut,
      unregisterShortcut: mockUnregisterShortcut,
      shortcuts: {},
    });
  });

  it('should render children', () => {
    render(
      <KeyboardShortcutsProvider>
        <div>Test Content</div>
      </KeyboardShortcutsProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should handle keyboard events', () => {
    const handleSearch = vi.fn();

    (useKeyboardShortcuts as any).mockReturnValue({
      registerShortcut: mockRegisterShortcut,
      unregisterShortcut: mockUnregisterShortcut,
      shortcuts: {
        'mod+k': handleSearch,
      },
    });

    render(
      <KeyboardShortcutsProvider>
        <div>Test Content</div>
      </KeyboardShortcutsProvider>
    );

    // Simulate Cmd+K or Ctrl+K
    fireEvent.keyDown(document, {
      key: 'k',
      metaKey: true,
    });

    expect(handleSearch).toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input', () => {
    const handleSearch = vi.fn();

    (useKeyboardShortcuts as any).mockReturnValue({
      registerShortcut: mockRegisterShortcut,
      unregisterShortcut: mockUnregisterShortcut,
      shortcuts: {
        'mod+k': handleSearch,
      },
    });

    render(
      <KeyboardShortcutsProvider>
        <input type="text" placeholder="Test input" />
      </KeyboardShortcutsProvider>
    );

    const input = screen.getByPlaceholderText('Test input');
    input.focus();

    fireEvent.keyDown(input, {
      key: 'k',
      metaKey: true,
    });

    // Should not trigger when focused on input
    expect(handleSearch).not.toHaveBeenCalled();
  });

  it('should support multiple shortcuts', () => {
    const handleSearch = vi.fn();
    const handleDashboard = vi.fn();

    (useKeyboardShortcuts as any).mockReturnValue({
      registerShortcut: mockRegisterShortcut,
      unregisterShortcut: mockUnregisterShortcut,
      shortcuts: {
        'mod+k': handleSearch,
        'mod+d': handleDashboard,
      },
    });

    render(
      <KeyboardShortcutsProvider>
        <div>Test Content</div>
      </KeyboardShortcutsProvider>
    );

    fireEvent.keyDown(document, {
      key: 'k',
      metaKey: true,
    });

    expect(handleSearch).toHaveBeenCalled();

    fireEvent.keyDown(document, {
      key: 'd',
      metaKey: true,
    });

    expect(handleDashboard).toHaveBeenCalled();
  });

  it('should handle modifier keys correctly', () => {
    const handleShortcut = vi.fn();

    (useKeyboardShortcuts as any).mockReturnValue({
      registerShortcut: mockRegisterShortcut,
      unregisterShortcut: mockUnregisterShortcut,
      shortcuts: {
        'mod+shift+k': handleShortcut,
      },
    });

    render(
      <KeyboardShortcutsProvider>
        <div>Test Content</div>
      </KeyboardShortcutsProvider>
    );

    fireEvent.keyDown(document, {
      key: 'k',
      metaKey: true,
      shiftKey: true,
    });

    expect(handleShortcut).toHaveBeenCalled();
  });
});
