'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getEnvironmentConfig,
  type EnvironmentConfig,
} from '@/app/actions/environment';

interface EnvironmentContextType {
  env: EnvironmentConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(
  undefined
);

export function EnvironmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [env, setEnv] = useState<EnvironmentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEnvironment = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const config = await getEnvironmentConfig();
      setEnv(config);

      // Enable console logging if configured
      if (config.consoleLogging && config.environment === 'development') {
        console.log('Environment configuration loaded:', config);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load environment')
      );
      console.error('Failed to load environment configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironment();
  }, []);

  return (
    <EnvironmentContext.Provider
      value={{
        env,
        isLoading,
        error,
        refetch: fetchEnvironment,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error(
      'useEnvironment must be used within an EnvironmentProvider'
    );
  }
  return context;
}

// Convenience hooks for common use cases
export function useAppUrl() {
  const { env } = useEnvironment();
  return env?.appUrl || '';
}

export function useReleaseInfo() {
  const { env } = useEnvironment();
  return {
    version: env?.releaseVersion || '0',
    date: env?.releaseDate || '',
    dateISO: env?.releaseDateISO || '',
  };
}

export function useFeatureFlag(feature: keyof EnvironmentConfig['features']) {
  const { env } = useEnvironment();
  return env?.features[feature] ?? false;
}

export function useConfig<K extends keyof EnvironmentConfig['config']>(
  key: K
): EnvironmentConfig['config'][K] | undefined {
  const { env } = useEnvironment();
  return env?.config[key];
}
