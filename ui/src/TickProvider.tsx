import React, { createContext, useContext, useState } from "react";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { Dayjs } from "dayjs";
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

type TickContextData = { tick: Dayjs };

const TickContext = createContext<TickContextData>({ tick: dayjs() });

export const TickProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [tick, setTick] = React.useState(dayjs());

  useState(() => {
    const timer = setInterval(() => setTick(dayjs()), 500);
    return () => clearInterval(timer);
  });

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
