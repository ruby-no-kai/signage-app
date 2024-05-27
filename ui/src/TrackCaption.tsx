import React, { useCallback, useMemo } from "react";

import { Box, Skeleton, Text } from "@chakra-ui/react";

import { Colors } from "./theme";
import { useApiContext } from "./ApiContext";
import {
  PubsubMessage,
  PubsubMessageHandler,
  PubsubSubscription,
} from "./PubsubProvider";
import { ApiPubsubMessage, CaptionMessage, TrackSlug } from "./Api";

export type Props = {
  track: TrackSlug;
  onUnsubscribe: () => void;
  h?: string;
};

const CAPTION_BACKTRACK = 50;

type CaptionCompletion = {
  ts: number;
  sequenceId: number;
};

export const TrackCaption: React.FC<{ track: TrackSlug }> = ({ track }) => {
  const apictx = useApiContext(false);
  const box = React.useRef<HTMLDivElement>(null);

  const [captions, setCaptions] = React.useState<CaptionMessage[]>([]);
  const [storedLastComplete, setLastComplete] =
    React.useState<CaptionCompletion | null>(null);

  const onMessage = useCallback(
    (message: PubsubMessage) => {
      const payload: ApiPubsubMessage = message.payload as ApiPubsubMessage; // XXX:
      switch (payload.kind) {
        case "Caption": {
          const newCaptions = captions;
          const existingCaptionIdx = newCaptions.findIndex(
            (c) => payload.sequence_id === c.sequence_id
          );
          let isNew = false;
          if (existingCaptionIdx < 0) {
            newCaptions.push(payload);
            isNew = true;
          } else {
            const existingCaption = newCaptions[existingCaptionIdx];
            if (payload.round > existingCaption.round) {
              newCaptions[existingCaptionIdx] = payload;
              isNew = true;
            }
          }

          newCaptions.sort((a, b) => a.sequence_id - b.sequence_id);

          if (newCaptions.length > CAPTION_BACKTRACK) {
            newCaptions.shift();
            setCaptions(newCaptions);
          } else {
            setCaptions(newCaptions);
          }
          if (isNew && !payload.is_partial)
            setLastComplete({
              sequenceId: payload.sequence_id,
              ts: new Date().getTime(),
            });
          break;
        }
      }
    },
    [captions, setCaptions, setLastComplete]
  );
  const pubsubStones = useMemo(() => {
    if (!apictx) return;
    const topic = `${apictx.config.iot_topic_prefix}/uplink/all/captions/${track}`;
    return (
      <>
        <PubsubMessageHandler topic={topic} onMessage={onMessage} />
        <PubsubSubscription
          packet={{
            subscriptions: [
              {
                qos: 0,
                topicFilter: topic,
              },
            ],
          }}
        />
      </>
    );
  }, [apictx?.config?.iot_topic_prefix, track]);

  const lastcaption =
    captions.length > 0 ? captions[captions.length - 1] : undefined;
  React.useEffect(() => {
    console.debug("caption autoscroll chance");
    if (!box.current) return;
    console.debug("caption autoscroll do");
    const el = box.current;
    el.scrollTop = el.scrollHeight;
  }, [box, captions, lastcaption?.sequence_id, lastcaption?.round]);

  if (!apictx) return <Skeleton />;

  const lastComplete =
    storedLastComplete &&
    new Date().getTime() - storedLastComplete.ts < 12 * 1000
      ? storedLastComplete
      : undefined;

  return (
    <>
      {pubsubStones}
      <Box
        h="100%"
        w="100%"
        overflowX="hidden"
        overflowY="hidden"
        wordBreak="break-word"
        bgColor="#000000"
        px="8px"
        py="12px"
        css={{
          "&::-webkit-scrollbar": { display: "none" },
          "&": { scrollbarWidth: "none" },
        }}
        ref={box}
      >
        <Text color="#FFFFFF">
          {captions.map((v) => (
            <Text
              as="span"
              color={
                v.is_partial || lastComplete?.sequenceId === v.sequence_id
                  ? "inherit"
                  : Colors.textMuted
              }
              key={v.sequence_id}
            >
              {v.transcript}{" "}
            </Text>
          ))}
        </Text>
      </Box>
    </>
  );
};
export default TrackCaption;
