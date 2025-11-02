import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndoRedo, type UndoableAction } from '../useUndoRedo';

describe('useUndoRedo', () => {
  let mockUndo: ReturnType<typeof vi.fn>;
  let mockRedo: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockUndo = vi.fn().mockResolvedValue(undefined);
    mockRedo = vi.fn().mockResolvedValue(undefined);
    vi.clearAllMocks();
  });
  
  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useUndoRedo());
    
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(0);
    expect(result.current.nextUndoDescription).toBeNull();
    expect(result.current.nextRedoDescription).toBeNull();
  });
  
  it('should add action to history', () => {
    const { result } = renderHook(() => useUndoRedo());
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(1);
    expect(result.current.nextUndoDescription).toBe('Mark task as completed');
  });
  
  it('should perform undo', async () => {
    const { result } = renderHook(() => useUndoRedo());
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    await act(async () => {
      await result.current.undo();
    });
    
    expect(mockUndo).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.nextRedoDescription).toBe('Mark task as completed');
  });
  
  it('should perform redo', async () => {
    const { result } = renderHook(() => useUndoRedo());
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    await act(async () => {
      await result.current.undo();
    });
    
    await act(async () => {
      await result.current.redo();
    });
    
    expect(mockRedo).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });
  
  it('should clear redo stack when new action is added', async () => {
    const { result } = renderHook(() => useUndoRedo());
    
    const action1: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Action 1',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    const action2: UndoableAction = {
      type: 'task_edit',
      timestamp: new Date(),
      description: 'Action 2',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action1);
    });
    
    await act(async () => {
      await result.current.undo();
    });
    
    expect(result.current.canRedo).toBe(true);
    expect(result.current.historySize).toBe(0); // After undo, history is empty
    
    act(() => {
      result.current.addAction(action2);
    });
    
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(1); // Only action2 is in history
  });
  
  it('should limit history to maxHistory', () => {
    const { result } = renderHook(() => useUndoRedo({ maxHistory: 3 }));
    
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.addAction({
          type: 'task_status_change',
          timestamp: new Date(),
          description: `Action ${i}`,
          undo: mockUndo,
          redo: mockRedo,
        });
      });
    }
    
    expect(result.current.historySize).toBe(3);
    expect(result.current.nextUndoDescription).toBe('Action 4');
  });
  
  it('should call onUndo callback', async () => {
    const onUndo = vi.fn();
    const { result } = renderHook(() => useUndoRedo({ onUndo }));
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    await act(async () => {
      await result.current.undo();
    });
    
    expect(onUndo).toHaveBeenCalledWith(action);
  });
  
  it('should call onRedo callback', async () => {
    const onRedo = vi.fn();
    const { result } = renderHook(() => useUndoRedo({ onRedo }));
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    await act(async () => {
      await result.current.undo();
    });
    
    await act(async () => {
      await result.current.redo();
    });
    
    expect(onRedo).toHaveBeenCalledWith(action);
  });
  
  it('should call onActionAdded callback', () => {
    const onActionAdded = vi.fn();
    const { result } = renderHook(() => useUndoRedo({ onActionAdded }));
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    expect(onActionAdded).toHaveBeenCalledWith(action);
  });
  
  it('should clear all history', () => {
    const { result } = renderHook(() => useUndoRedo());
    
    act(() => {
      result.current.addAction({
        type: 'task_status_change',
        timestamp: new Date(),
        description: 'Action 1',
        undo: mockUndo,
        redo: mockRedo,
      });
    });
    
    act(() => {
      result.current.clear();
    });
    
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(0);
  });
  
  it('should prevent concurrent undo/redo operations', async () => {
    const { result } = renderHook(() => useUndoRedo());
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    // Start undo
    const undoPromise = act(async () => {
      await result.current.undo();
    });
    
    // Try to undo again while first is in progress
    await act(async () => {
      await result.current.undo();
    });
    
    await undoPromise;
    
    // Should only call undo once
    expect(mockUndo).toHaveBeenCalledTimes(1);
  });
  
  it('should handle undo errors gracefully', async () => {
    const errorUndo = vi.fn().mockRejectedValue(new Error('Undo failed'));
    const { result } = renderHook(() => useUndoRedo());
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: errorUndo,
      redo: mockRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    await expect(async () => {
      await act(async () => {
        await result.current.undo();
      });
    }).rejects.toThrow('Undo failed');
    
    // Should still be able to undo after error
    expect(result.current.canUndo).toBe(true);
  });
  
  it('should handle redo errors gracefully', async () => {
    const errorRedo = vi.fn().mockRejectedValue(new Error('Redo failed'));
    const { result } = renderHook(() => useUndoRedo());
    
    const action: UndoableAction = {
      type: 'task_status_change',
      timestamp: new Date(),
      description: 'Mark task as completed',
      undo: mockUndo,
      redo: errorRedo,
    };
    
    act(() => {
      result.current.addAction(action);
    });
    
    await act(async () => {
      await result.current.undo();
    });
    
    await expect(async () => {
      await act(async () => {
        await result.current.redo();
      });
    }).rejects.toThrow('Redo failed');
    
    // Should still be able to redo after error
    expect(result.current.canRedo).toBe(true);
  });
});
