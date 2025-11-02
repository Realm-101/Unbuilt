import { useCallback, useRef, useState } from 'react';

/**
 * Action types that can be undone/redone
 */
export type UndoableActionType = 
  | 'task_status_change'
  | 'task_edit'
  | 'task_create'
  | 'task_delete'
  | 'task_reorder'
  | 'phase_edit';

/**
 * Undoable action interface
 */
export interface UndoableAction {
  type: UndoableActionType;
  timestamp: Date;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  metadata?: Record<string, any>;
}

interface UseUndoRedoOptions {
  /** Maximum number of actions to keep in history (default: 20) */
  maxHistory?: number;
  /** Callback when undo is performed */
  onUndo?: (action: UndoableAction) => void;
  /** Callback when redo is performed */
  onRedo?: (action: UndoableAction) => void;
  /** Callback when action is added */
  onActionAdded?: (action: UndoableAction) => void;
}

interface UseUndoRedoReturn {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Perform undo */
  undo: () => Promise<void>;
  /** Perform redo */
  redo: () => Promise<void>;
  /** Add an action to the history */
  addAction: (action: UndoableAction) => void;
  /** Clear all history */
  clear: () => void;
  /** Get the current history size */
  historySize: number;
  /** Get the description of the next undo action */
  nextUndoDescription: string | null;
  /** Get the description of the next redo action */
  nextRedoDescription: string | null;
  /** Whether currently performing undo/redo */
  isPerforming: boolean;
}

/**
 * useUndoRedo Hook
 * 
 * Manages undo/redo functionality for plan modifications.
 * Maintains a stack of actions with a maximum history limit.
 * 
 * Requirements: Non-functional (Usability) - Task 45
 * 
 * @example
 * ```tsx
 * const { canUndo, canRedo, undo, redo, addAction } = useUndoRedo({
 *   maxHistory: 20,
 *   onUndo: (action) => console.log('Undid:', action.description),
 * });
 * 
 * // Add an action
 * addAction({
 *   type: 'task_status_change',
 *   description: 'Mark task as completed',
 *   undo: async () => { await updateTask({ status: 'not_started' }); },
 *   redo: async () => { await updateTask({ status: 'completed' }); },
 * });
 * ```
 */
export function useUndoRedo({
  maxHistory = 20,
  onUndo,
  onRedo,
  onActionAdded,
}: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  // Use refs to avoid re-renders when history changes
  const undoStackRef = useRef<UndoableAction[]>([]);
  const redoStackRef = useRef<UndoableAction[]>([]);
  const [isPerforming, setIsPerforming] = useState(false);
  
  // Force re-render when stacks change
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => forceUpdate({}), []);
  
  /**
   * Add an action to the undo stack
   */
  const addAction = useCallback((action: UndoableAction) => {
    // Clear redo stack when new action is added
    redoStackRef.current = [];
    
    // Add to undo stack
    undoStackRef.current.push(action);
    
    // Limit history size
    if (undoStackRef.current.length > maxHistory) {
      undoStackRef.current.shift();
    }
    
    if (onActionAdded) {
      onActionAdded(action);
    }
    
    triggerUpdate();
  }, [maxHistory, onActionAdded, triggerUpdate]);
  
  /**
   * Perform undo
   */
  const undo = useCallback(async () => {
    if (undoStackRef.current.length === 0 || isPerforming) {
      return;
    }
    
    setIsPerforming(true);
    
    try {
      // Pop action from undo stack
      const action = undoStackRef.current.pop();
      if (!action) return;
      
      // Perform undo
      await action.undo();
      
      // Add to redo stack
      redoStackRef.current.push(action);
      
      if (onUndo) {
        onUndo(action);
      }
      
      triggerUpdate();
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    } finally {
      setIsPerforming(false);
    }
  }, [isPerforming, onUndo, triggerUpdate]);
  
  /**
   * Perform redo
   */
  const redo = useCallback(async () => {
    if (redoStackRef.current.length === 0 || isPerforming) {
      return;
    }
    
    setIsPerforming(true);
    
    try {
      // Pop action from redo stack
      const action = redoStackRef.current.pop();
      if (!action) return;
      
      // Perform redo
      await action.redo();
      
      // Add back to undo stack
      undoStackRef.current.push(action);
      
      if (onRedo) {
        onRedo(action);
      }
      
      triggerUpdate();
    } catch (error) {
      console.error('Redo failed:', error);
      throw error;
    } finally {
      setIsPerforming(false);
    }
  }, [isPerforming, onRedo, triggerUpdate]);
  
  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    triggerUpdate();
  }, [triggerUpdate]);
  
  // Get next action descriptions
  const nextUndoDescription = undoStackRef.current.length > 0
    ? undoStackRef.current[undoStackRef.current.length - 1].description
    : null;
  
  const nextRedoDescription = redoStackRef.current.length > 0
    ? redoStackRef.current[redoStackRef.current.length - 1].description
    : null;
  
  return {
    canUndo: undoStackRef.current.length > 0 && !isPerforming,
    canRedo: redoStackRef.current.length > 0 && !isPerforming,
    undo,
    redo,
    addAction,
    clear,
    historySize: undoStackRef.current.length,
    nextUndoDescription,
    nextRedoDescription,
    isPerforming,
  };
}
