import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiContext, useApiContext } from "./ApiContext";
import { PubsubContextDataReady, PubsubMessageHandler } from "./PubsubProvider";
import { mqtt5 } from "aws-crt/dist.browser/browser";
import { HeartbeatDownlinkMessage } from "./Api";
import { ulid } from "ulid";
import dayjs from "./dayjs";
import type { Dayjs } from "dayjs";

const RANDOM_WINDOW = 12;

export const KioskHeartbeat: React.FC = () => {
  const ctx = useApiContext(false);
  const bootedAt = useMemo(() => dayjs(), []);
  const cb = useCallback(() => {
    return;
  }, [ctx]);

  useEffect(() => {
    if (!ctx) return;
    const pubsub = ctx.pubsub;
    if (pubsub.state !== "ready") return;
    const fn = () => sendHeartbeat(ctx, pubsub, bootedAt);
    setTimeout(fn, 0);
    const timer = setInterval(() => {
      const randomizedWindow = Math.floor(Math.random() * RANDOM_WINDOW) * 1000;
      setTimeout(fn, randomizedWindow);
    }, 20000);
    return () => clearInterval(timer);
  }, [bootedAt, ctx, ctx?.pubsub?.state]);

  return (
    <>
      <PubsubMessageHandler test={/\/uplink\/heartbeat$/} onMessage={cb} />
    </>
  );
};

function sendHeartbeat(
  ctx: ApiContext,
  pubsub: PubsubContextDataReady,
  bootedAt: Dayjs
) {
  const now = dayjs();
  const payload: HeartbeatDownlinkMessage = {
    kind: "HeartbeatDownlink",
    from: ctx.identityId,
    nonce: ulid(now.toDate().getTime()),
    ts: now.unix(),
    revision: "TODO",
    booted_at: bootedAt.unix(),
    path: `${location.pathname}${location.search}`,
  };
  console.log("sendHeartbeat", payload);
  pubsub.client.publish({
    qos: mqtt5.QoS.AtLeastOnce,
    topicName: `${ctx.config.iot_topic_prefix}/downlink/kiosk=${ctx.identityId}/heartbeat`,
    payload: JSON.stringify(payload),
  });
}
