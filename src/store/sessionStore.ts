import { create } from 'zustand';
import type { CardState } from '../types';
import type { QuizSession } from '../services/quizEngine';

interface SessionStore {
  activeSession: QuizSession | null;
  setSession: (session: QuizSession) => void;
  /** Replaces the card matching updatedCard.wordId in the active session queue. */
  updateCard: (updatedCard: CardState) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  activeSession: null,

  setSession: (session) => set({ activeSession: session }),

  updateCard: (updatedCard) =>
    set((state) => {
      if (!state.activeSession) return state;
      const queue = state.activeSession.queue.map((c) =>
        c.wordId === updatedCard.wordId ? updatedCard : c,
      );
      return { activeSession: { ...state.activeSession, queue } };
    }),

  clearSession: () => set({ activeSession: null }),
}));
