import dayjs from "dayjs";
import { LightningTimer } from "./Api";
import { useTick } from "./TickProvider";

export type LightningTimerStatus = {
  tick: dayjs.Dayjs;
  remaining: number;
  m: string;
  s: string;
  shouldVisible: boolean;

  isStaticTick: boolean;
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
  const localTick = useTick();

  if (!timer) return undefined;

  const isStaticTick = !!timer.tick;
  const tick = isStaticTick && timer.tick ? dayjs.unix(timer.tick) : localTick;

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
    isStaticTick,
    isEnabled,
    isExpired,
    isCompleted,

    startsAt: dayjs.unix(timer.starts_at),
    endsAt: dayjs.unix(timer.ends_at),
    expiresAt: dayjs.unix(timer.expires_at),

    settings: timer,
  };
}
