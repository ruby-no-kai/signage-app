import React, { useCallback, useMemo } from "react";

import { Box, Flex, Skeleton } from "@chakra-ui/react";
import { Colors } from "./theme";
import { ChatHistoryView } from "./ChatHistoryView";
import { useApiContext } from "./ApiContext";
import { useKioskContext } from "./KioskProvider";
import {
  PubsubMessage,
  PubsubMessageHandler,
  PubsubSubscription,
} from "./PubsubProvider";
import { ApiPubsubMessage, ChatMessage, TrackSlug } from "./Api";

const MESSAGE_BACKTRACK = 60;

export const SubScreenChatView: React.FC<{ track: TrackSlug }> = ({
  track,
}) => {
  const apictx = useApiContext(false);

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const onMessage = useCallback(
    (message: PubsubMessage, event: unknown) => {
      const payload: ApiPubsubMessage = message.payload as ApiPubsubMessage; // XXX:
      console.log(payload);
      switch (payload.kind) {
        case "Chat": {
          if (payload.track !== track) break;
          const newMessages = messages;
          console.log("messages", messages);
          const existingIdx = newMessages.findIndex((c) => payload.id === c.id);
          if (existingIdx < 0) {
            console.log("new");
            newMessages.push(payload);
          } else {
            newMessages[existingIdx] = payload;
          }

          newMessages.sort((a, b) => a.timestamp - b.timestamp);

          if (newMessages.length > MESSAGE_BACKTRACK) {
            newMessages.shift();
            setMessages(newMessages);
          } else {
            setMessages(newMessages);
          }
          console.log("newMessages", newMessages);
          break;
        }
      }
    },
    [messages, setMessages]
  );

  const pubsubStones = useMemo(() => {
    if (!apictx) return;
    const topic = `${apictx.config.iot_topic_prefix}/uplink/all/chats/${track}`;
    console.log("pubsubStones", topic);

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

  return (
    <React.Suspense fallback={<Skeleton w="100%" h="100%" />}>
      {pubsubStones}
      {/* Adjust to w="47.5vw" h="51vw"  w=912 h=979 */}
      {/*
      <Box w={`${47.5 * 0.4}vw`} h={`${51 * 0.4}vw`} css={{ transform: `scale(${1 / 0.4})`, transformOrigin: "0 0" }}>
        */}
      <Box
        w={`35%`}
        h={`35%`}
        css={{ transform: `scale(${1 / 0.35})`, transformOrigin: "0 0" }}
      >
        {/*<TrackChat track={track} hideForm={true} disableSponsorPromo={true} />*/}
        <Flex
          direction="column"
          h="100%"
          w="100%"
          border="1px solid"
          borderColor={Colors.chatBorder2}
        >
          <Box
            flexGrow={1}
            flexShrink={0}
            flexBasis={0}
            w="100%"
            overflowX="hidden"
            overflowY="hidden"
            bg={Colors.chatBg}
          >
            <ChatHistoryView messages={messages} />
          </Box>
        </Flex>
      </Box>
    </React.Suspense>
  );
};
