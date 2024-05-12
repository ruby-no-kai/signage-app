import React, { createContext, useContext } from "react";
import { KioskLogin } from "./KioskLogin";
import { KioskHeartbeat } from "./KioskHeartbeat";
import { KioskKind, TrackSlug } from "./Api";

export type KioskContextData = {
  track: TrackSlug;
  kind: KioskKind;
};
const KioskContext = createContext<KioskContextData>({
  track: "_unknown",
  kind: "hallway",
});

export const KioskProvider: React.FC<
  {
    children: React.ReactNode;
  } & KioskContextData
> = ({ children, ...props }) => {
  return (
    <KioskContext.Provider value={props}>
      <KioskLogin />
      {/* <KioskHeartbeat /> */}
      <>{children}</>
    </KioskContext.Provider>
  );
};

export function useKioskContext() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw "useKioskContext() outside of KioskProvider";
  return ctx;
}
