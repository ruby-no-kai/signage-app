import React, { createContext, useContext, useEffect, useState } from "react";
import dayjs from "./dayjs";
import type { Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";

type TickContextData = { tick: Dayjs };

const TickContext = createContext<TickContextData>({ tick: dayjs() });

export const TickProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [searchParams] = useSearchParams();

  const staticTickMaybe = searchParams.get("tick");
  const staticTickNum = staticTickMaybe ? Number(staticTickMaybe) : undefined;
  const staticTick = staticTickNum ? dayjs.unix(staticTickNum) : undefined;
  const [tick, setTick] = React.useState(staticTick ?? dayjs());

  useEffect(() => {
    if (staticTick) return;
    const timer = setInterval(() => setTick(dayjs()), 500);
    return () => clearInterval(timer);
  }, [staticTick]);

  return (
    <>
      <TickContext.Provider value={{ tick }}>{children}</TickContext.Provider>
    </>
  );
};

export function useTick() {
  const ctx = useContext(TickContext);
  if (!ctx) throw "useTick() outside of Tick";
  return ctx.tick;
}
