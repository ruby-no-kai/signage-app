import React from "react";

import {
  Flex,
  VStack,
  HStack,
  Stack,
  Box,
  Button,
  Skeleton,
} from "@chakra-ui/react";

import type { ChatMessage } from "./Api";

import { ChatMessageView } from "./ChatMessageView";

export type Props = {
  messages: ChatMessage[];
};

export const ChatHistoryView: React.FC<Props> = ({ messages }) => {
  const [autoscrollEnabled, setAutoscrollEnabled] = React.useState(true);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const [box, setBox] = React.useState<HTMLDivElement | null>(null);
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const boxCb = React.useCallback(
    (el: HTMLDivElement) => {
      boxRef.current = el;
      setBox(el);
    },
    [setBox]
  );

  const messageViews = messages
    .filter((v) => v.content !== undefined && v.content !== null)
    .map((v) => <ChatMessageView key={v.id} message={v} />)
    .reverse();
  const latestMessageAt = messages[0]?.timestamp;
  const lastLatestMessageAt = usePrevious(latestMessageAt);

  //React.useEffect(() => {
  //  if (!loading) return;
  //  if (!box.current) return;
  //  const el = box.current;

  //  el.addEventListener("scroll", function () {
  //    //const flag = el.scrollTop === el.scrollHeight;
  //    //console.log("setAutoscrollEnabled on scroll", flag, el.scrollTop, el.scrollHeight);
  //    setAutoscrollEnabled(false);
  //  });
  //}, [loading, box]);

  //React.useEffect(() => {
  //  if (autoscrollEnabled) return;
  //  if (lastLatestMessageAt && latestMessageAt && latestMessageAt.isSame(lastLatestMessageAt)) return;

  //  setShowScrollButton(true);
  //}, [box.current, autoscrollEnabled, latestMessageAt, lastLatestMessageAt]);

  React.useEffect(() => {
    console.log("autoscroll chance");
    if (!autoscrollEnabled) return;
    if (!box) return;
    console.log("autoscroll do");
    box.scrollTop = box.scrollHeight;
  }, [box, autoscrollEnabled, messages]);

  //if (loading) {
  //  return (
  //    <Flex h="100%" overflowY="hidden" direction="column-reverse">
  //      <Skeleton w="100%" h="100%" />
  //    </Flex>
  //  );
  //}

  return (
    <Box
      h="100%"
      overflowX="hidden"
      overflowY="scroll"
      wordBreak="break-word"
      ref={boxCb}
    >
      {showScrollButton ? (
        <Button onClick={() => setAutoscrollEnabled(true)}>bottom</Button>
      ) : null}
      <VStack w="100%" spacing="2px" my="8px">
        {messageViews}
      </VStack>
    </Box>
  );
};

function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
