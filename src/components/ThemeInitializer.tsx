'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/store/useKanbanStore';

export function ThemeInitializer() {
  const { initTheme } = useKanbanStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return null;
}
