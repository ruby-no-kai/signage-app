import React, { useCallback } from "react";

import {
  HStack,
  VStack,
  Heading,
  Flex,
  Box,
  Container,
  Image,
  Text,
} from "@chakra-ui/react";
import { AspectRatio } from "@chakra-ui/react";

import Api, { consumeChatAdminControl, TrackSlug } from "./Api";
import { Colors } from "./theme";
import { Logo } from "./Logo";

import { useChat } from "./ChatProvider";
import { ChatUpdate } from "./ChatSession";
import { useParams } from "react-router-dom";
import { useKioskContext } from "./KioskProvider";
import { TickProvider } from "./TickProvider";
import { useApiContext } from "./ApiContext";
import { useLightningTimer } from "./LightningTimer";

import { SubScreenCaptionView } from "./SubScreenCaptionView";
import { SubScreenLightningTimerView } from "./SubScreenLightningTimerView";

export const SubScreenPage: React.FC = () => {
  return (
    <TickProvider>
      <Box w="100vw" h="auto">
        <AspectRatio ratio={16 / 9}>
          <Box bgColor={Colors.bg} bgSize="contain" w="100%" h="100%" p="0.7vw">
            <SubScreenInner />
          </Box>
        </AspectRatio>
      </Box>
    </TickProvider>
  );
};

type InfoMode = "announcement" | "lightning_timer" | "caption";

export const SubScreenInner: React.FC = () => {
  const { track } = useKioskContext();
  const apictx = useApiContext(false);
  const { data: screen } = Api.useScreenControl(apictx, track);

  const timer = useLightningTimer(screen?.lightning_timer);

  const infoMode = ((): InfoMode => {
    if (timer?.shouldVisible) return "lightning_timer";
    if (screen?.intermission) return "announcement";
    return "caption";
  })();

  return (
    <Flex h="100%" w="100%" justify="space-between" direction="column">
      <Box w="100%" h="30%" overflow="hidden">
        {infoMode === "announcement"
          ? /*<SubScreenAnnouncementsView track={track} />*/ null
          : null}
        {infoMode === "lightning_timer" && timer ? (
          <SubScreenLightningTimerView timer={timer} />
        ) : null}
        {infoMode === "caption" ? <SubScreenCaptionView track={track} /> : null}
      </Box>
      <Box w="100%" flexGrow={2}>
        {/*<SubScreenChatView track={track} />*/}
      </Box>
    </Flex>
  );
};

export default SubScreenPage;
