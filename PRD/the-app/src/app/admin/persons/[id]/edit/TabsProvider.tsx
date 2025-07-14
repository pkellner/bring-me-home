'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  imageUpdateTrigger: number;
  triggerImageUpdate: () => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('details');
  const [imageUpdateTrigger, setImageUpdateTrigger] = useState(0);

  const triggerImageUpdate = useCallback(() => {
    setImageUpdateTrigger(prev => prev + 1);
  }, []);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, imageUpdateTrigger, triggerImageUpdate }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}