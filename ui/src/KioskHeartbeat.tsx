import React, { useEffect, useMemo, useState } from "react";
import { ApiContext, useApiContext } from "./ApiContext";
import {
  Mqtt5MessageReceivedEvent,
  PubsubContextDataReady,
  PubsubMessage,
  PubsubMessageHandler,
} from "./PubsubProvider";
import { mqtt5 } from "aws-crt/dist.browser/browser";
import {
  ApiPubsubMessage,
  HeartbeatDownlinkMessage,
  guardApiPubsubMessage,
} from "./Api";
import { ulid } from "ulid";
import dayjs from "./dayjs";
import type { Dayjs } from "dayjs";
import { doReload } from "./reload";

const RANDOM_WINDOW = 12;
const HEARTBEAT_TIMEOUT = 90;

export const KioskHeartbeat: React.FC = () => {
  const ctx = useApiContext(false);
  const [bootedAt] = useState(dayjs());
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | undefined>(
    undefined
  );
  const cb = useMemo(() => {
    return (message: PubsubMessage, event: Mqtt5MessageReceivedEvent) => {
      const payload = guardApiPubsubMessage(message.payload);
      if (!payload) return;

      switch (payload.kind) {
        case "HeartbeatUplink": {
          setLastHeartbeatAt(dayjs().toDate().getTime());
          break;
        }
      }
    };
  }, [setLastHeartbeatAt]);

  useEffect(() => {
    console.log("heartbeat timer", [bootedAt, ctx]);
    if (!ctx) return;
    const pubsub = ctx.pubsub;
    if (pubsub.state !== "ready") return;
    console.log("heartbeat timer start");
    const fn = () => sendHeartbeat(ctx, pubsub, bootedAt);
    setTimeout(fn, 0);
    const timer = setInterval(() => {
      const randomizedWindow = Math.floor(Math.random() * RANDOM_WINDOW) * 1000;
      setTimeout(fn, randomizedWindow);
    }, 20000);
    return () => clearInterval(timer);
  }, [bootedAt, ctx?.pubsub?.state]);

  useEffect(() => {
    console.log("watchdog set");
    const timer = setTimeout(() => {
      console.warn("watchdog engage");
      doReload();
    }, HEARTBEAT_TIMEOUT * 1000);
    return () => {
      console.log("watchdog removed");
      clearTimeout(timer);
    };
  }, [lastHeartbeatAt]);
  return (
    <>
      <PubsubMessageHandler test={/\/uplink\/all\/heartbeat$/} onMessage={cb} />
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
    revision: "TODO--05161342",
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
