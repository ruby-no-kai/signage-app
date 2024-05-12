import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Api, LightningTimer, Track } from "./Api";
import { useTick } from "./TickProvider";

export type LightningTimerStatus = {
  tick: dayjs.Dayjs;
  remaining: number;
  m: string;
  s: string;
  shouldVisible: boolean;
  isEnabled: boolean;
  isExpired: undefined | boolean;
  isCompleted: boolean;

  startsAt: dayjs.Dayjs;
  endsAt: dayjs.Dayjs;
  expiresAt: dayjs.Dayjs;

  settings: LightningTimer;
};

export function useLightningTimer(
  timer: LightningTimer | undefined
): LightningTimerStatus | undefined {
  const tick = useTick();

  if (!timer) return undefined;

  const isEnabled = !!timer?.enabled;
  const isExpired = timer?.enabled
    ? timer.expires_at <= tick.unix()
    : undefined;

  const remaining = Math.max(0, timer.ends_at - tick.unix());
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  const isCompleted = remaining === 0;

  return {
    tick,

    remaining,
    m: `${m < 10 ? "0" : ""}${m}`,
    s: `${s < 10 ? "0" : ""}${s}`,

    shouldVisible: isEnabled && !isExpired,
    isEnabled,
    isExpired,
    isCompleted,

    startsAt: dayjs.unix(timer.starts_at),
    endsAt: dayjs.unix(timer.ends_at),
    expiresAt: dayjs.unix(timer.expires_at),

    settings: timer,
  };
}
