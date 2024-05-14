import React, { createContext, useContext, useEffect } from "react";
import { KioskLogin } from "./KioskLogin";
import { KioskHeartbeat } from "./KioskHeartbeat";
import { KioskKind, TrackSlug, guardKioskKind } from "./Api";
import { useSearchParams } from "react-router-dom";

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
  useEffect(() => {
    console.log("KioskProvider/kioskProps", props);
  }, [props]);
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

export function useKioskPropsFromSearch(): KioskContextData {
  const [searchParams] = useSearchParams();
  return {
    track: searchParams.get("track") || "_unknown",
    kind: guardKioskKind(searchParams.get("kind") || ""),
  };
}
