/**
 * NERVE Context Provider
 * Provides state and dispatch to the entire dashboard.
 */
import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import { initialState, nerveReducer, type NerveState, type NerveAction } from './nerve-store';

interface NerveContextType {
  state: NerveState;
  dispatch: Dispatch<NerveAction>;
}

const NerveContext = createContext<NerveContextType | null>(null);

export function NerveProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(nerveReducer, initialState);

  return (
    <NerveContext.Provider value={{ state, dispatch }}>
      {children}
    </NerveContext.Provider>
  );
}

export function useNerve() {
  const context = useContext(NerveContext);
  if (!context) {
    throw new Error('useNerve must be used within a NerveProvider');
  }
  return context;
}
