"use client";

import { createContext, useContext } from "react";
import type { ActionResult } from "@/lib/types";

const ActionResultContext = createContext<(result: ActionResult) => void>(() => {});

export const ActionResultProvider = ActionResultContext.Provider;

export function useHandleResult() {
  return useContext(ActionResultContext);
}
