import { useSWRConfig } from "swr";
import { useApiContext } from "./ApiContext";
import { useCallback } from "react";
import { PubsubMessageHandler } from "./PubsubProvider";
import { ApiPubsubMessage, BroadcastMutateMessage } from "./Api";

export const ApiPubsubReceiver: React.FC<void> = () => {
  const swr = useSWRConfig();
  const ctx = useApiContext(false);
  const cb = useCallback(
    (message, event) => {
      const payload: ApiPubsubMessage = message.payload;
      switch (payload.kind) {
        case "BroadcastMutate":
          handleBroadcastMutate(swr, payload);
          break;
      }
    },
    [swr, ctx]
  );
  return (
    <>
      <PubsubMessageHandler test={/uplink\/all\/updates$/} onMessage={cb} />
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
