"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import {
  useServiceEditorReducer,
  type UseServiceEditorProps,
  type ServiceEditorValue,
} from "./use-service-editor";

const ServiceEditorContext = createContext<ServiceEditorValue | null>(null);

interface ServiceEditorProviderProps extends UseServiceEditorProps {
  children: ReactNode;
}

export function ServiceEditorProvider({
  children,
  ...props
}: ServiceEditorProviderProps) {
  const value = useServiceEditorReducer(props);
  return (
    <ServiceEditorContext.Provider value={value}>
      {children}
    </ServiceEditorContext.Provider>
  );
}

export function useServiceEditor(): ServiceEditorValue {
  const ctx = useContext(ServiceEditorContext);
  if (!ctx) {
    throw new Error(
      "useServiceEditor must be used inside ServiceEditorProvider"
    );
  }
  return ctx;
}
