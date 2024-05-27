import { useSWRConfig } from "swr";
import { useApiContext } from "./ApiContext";
import { useCallback } from "react";
import {
  PubsubMessageHandler,
  Mqtt5MessageReceivedEvent,
  PubsubMessage,
} from "./PubsubProvider";
import {
  ApiPubsubMessage,
  BroadcastMutateMessage,
  IdentMessage,
  ReloadMessage,
  guardApiPubsubMessage,
} from "./Api";
import dayjs from "./dayjs";
import { doReload } from "./reload";
import { useToast } from "@chakra-ui/react";

export const ApiPubsubReceiver: React.FC = () => {
  const swr = useSWRConfig();
  const toast = useToast();
  const ctx = useApiContext(false);
  const cb = useCallback(
    (message: PubsubMessage, event: Mqtt5MessageReceivedEvent) => {
      const payload = guardApiPubsubMessage(message.payload);
      if (!payload) return;
      switch (payload.kind) {
        case "BroadcastMutate": {
          handleBroadcastMutate(swr, payload);
          break;
        }
        case "Reload": {
          handleReload(payload);
          break;
        }
        case "Ident": {
          handleIdent(payload, toast);
        }
      }
    },
    [swr, toast, ctx]
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
  doReload(payload);
}

function handleIdent(
  payload: IdentMessage,
  toast: ReturnType<typeof useToast>
) {
  toast({
    title: `Ident ${payload.nonce}`,
    description: `from ${payload.from}`,
    status: "success",
    duration: 2000,
    isClosable: true,
    position: "top",
  });
}
