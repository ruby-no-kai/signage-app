import { useSWRConfig } from "swr";
import { useApiContext } from "./ApiContext";
import { useCallback } from "react";
import { PubsubMessageHandler } from "./PubsubProvider";
import { ApiPubsubMessage, BroadcastMutateMessage, ReloadMessage } from "./Api";

import dayjs from "./dayjs";

export const ApiPubsubReceiver: React.FC = () => {
  const swr = useSWRConfig();
  const ctx = useApiContext(false);
  const cb = useCallback(
    (message, event) => {
      const payload: ApiPubsubMessage = message.payload;
      switch (payload.kind) {
        case "BroadcastMutate": {
          handleBroadcastMutate(swr, payload);
          break;
        }
        case "Reload": {
          handleReload(payload);
          break;
        }
      }
    },
    [swr, ctx]
  );
  return (
    <>
      <PubsubMessageHandler test={/\/uplink\/.+$/} onMessage={cb} />
    </>
  );
};

function handleBroadcastMutate(
  swr: ReturnType<typeof useSWRConfig>,
  payload: BroadcastMutateMessage
) {
  console.log("handleBroadcastMutate", payload);
  payload.urls.forEach((v) => {
    swr.mutate(v);
  });
}

function handleReload(payload: ReloadMessage) {
  const now = dayjs().unix();
  if (!payload.ts) {
    console.warn("ignore reload due to ts", payload);
    return;
  }
  if (now - payload.ts > 60) {
    console.warn("ignore reload due to ts", payload);
    return;
  }
  console.log("reloading", payload);
  location.reload();
}
