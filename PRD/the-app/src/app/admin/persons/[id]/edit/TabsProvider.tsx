'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TabChanges {
  details: boolean;
  'person-image': boolean;
  'gallery-images': boolean;
}

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  imageUpdateTrigger: number;
  triggerImageUpdate: () => void;
  hasChanges: TabChanges;
  setHasChanges: (tab: keyof TabChanges, value: boolean) => void;
  pendingTabSwitch: string | null;
  setPendingTabSwitch: (tab: string | null) => void;
  resetTabChanges: (tab: keyof TabChanges) => void;
  hasAnyChanges: () => boolean;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('details');
  const [imageUpdateTrigger, setImageUpdateTrigger] = useState(0);
  const [hasChanges, setHasChangesState] = useState<TabChanges>({
    details: false,
    'person-image': false,
    'gallery-images': false,
  });
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);

  const triggerImageUpdate = useCallback(() => {
    setImageUpdateTrigger(prev => prev + 1);
  }, []);

  const setHasChanges = useCallback((tab: keyof TabChanges, value: boolean) => {
    setHasChangesState(prev => ({ ...prev, [tab]: value }));
  }, []);

  const resetTabChanges = useCallback((tab: keyof TabChanges) => {
    setHasChangesState(prev => ({ ...prev, [tab]: false }));
  }, []);

  const hasAnyChanges = useCallback(() => {
    return Object.values(hasChanges).some(changed => changed);
  }, [hasChanges]);

  return (
    <TabsContext.Provider 
      value={{ 
        activeTab, 
        setActiveTab, 
        imageUpdateTrigger, 
        triggerImageUpdate,
        hasChanges,
        setHasChanges,
        pendingTabSwitch,
        setPendingTabSwitch,
        resetTabChanges,
        hasAnyChanges
      }}
    >
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