import React, { createContext, useContext, ReactNode } from 'react';
import { useUndoRedo, type UndoableAction } from '@/hooks/useUndoRedo';

interface UndoRedoContextValue {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  addAction: (action: UndoableAction) => void;
  clear: () => void;
  historySize: number;
  nextUndoDescription: string | null;
  nextRedoDescription: string | null;
  isPerforming: boolean;
}

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

interface UndoRedoProviderProps {
  children: ReactNode;
  maxHistory?: number;
  onUndo?: (action: UndoableAction) => void;
  onRedo?: (action: UndoableAction) => void;
  onActionAdded?: (action: UndoableAction) => void;
}

/**
 * UndoRedoProvider Component
 * 
 * Provides undo/redo functionality to child components via React Context.
 * This allows any component in the tree to add undoable actions and
 * perform undo/redo operations.
 * 
 * Requirements: Non-functional (Usability) - Task 45
 */
export function UndoRedoProvider({
  children,
  maxHistory = 20,
  onUndo,
  onRedo,
  onActionAdded,
}: UndoRedoProviderProps) {
  const undoRedo = useUndoRedo({
    maxHistory,
    onUndo,
    onRedo,
    onActionAdded,
  });
  
  return (
    <UndoRedoContext.Provider value={undoRedo}>
      {children}
    </UndoRedoContext.Provider>
  );
}

/**
 * useUndoRedoContext Hook
 * 
 * Access undo/redo functionality from any component within UndoRedoProvider.
 * 
 * @throws Error if used outside of UndoRedoProvider
 * 
 * @example
 * ```tsx
 * const { addAction, undo, redo } = useUndoRedoContext();
 * 
 * // Add an undoable action
 * addAction({
 *   type: 'task_status_change',
 *   description: 'Mark task as completed',
 *   undo: async () => { ... },
 *   redo: async () => { ... },
 * });
 * ```
 */
export function useUndoRedoContext(): UndoRedoContextValue {
  const context = useContext(UndoRedoContext);
  
  if (!context) {
    throw new Error('useUndoRedoContext must be used within UndoRedoProvider');
  }
  
  return context;
}
