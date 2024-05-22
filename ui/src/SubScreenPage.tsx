import React from "react";

import { Flex, Box } from "@chakra-ui/react";
import { AspectRatio } from "@chakra-ui/react";

import Api from "./Api";
import { ScreenColors } from "./theme";

import { useKioskContext } from "./KioskProvider";
import { TickProvider } from "./TickProvider";
import { useApiContext } from "./ApiContext";
import { useLightningTimer } from "./LightningTimer";

import { SubScreenCaptionView } from "./SubScreenCaptionView";
import { SubScreenLightningTimerView } from "./SubScreenLightningTimerView";
import { SubScreenAnnouncementsView } from "./SubScreenAnnouncementsView";
import { SubScreenChatView } from "./SubScreenChatView";
import { SubScreenChatHeader } from "./SubScreenChatHeader";

export const SubScreenPage: React.FC = () => {
  return (
    <TickProvider>
      <Box w="100vw" h="auto">
        <AspectRatio ratio={16 / 9}>
          <Box
            bgColor={ScreenColors.bg}
            bgSize="contain"
            w="100%"
            h="100%"
            p="0.7vw"
          >
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
    <Flex
      h="100%"
      w="100%"
      justify="space-between"
      direction="column"
      overflow="hidden"
    >
      {infoMode !== "caption" ? (
        <Box w="100%" h="30%" overflow="hidden">
          {infoMode === "announcement" ? (
            <SubScreenAnnouncementsView track={track} />
          ) : null}
          {infoMode === "lightning_timer" && timer ? (
            <SubScreenLightningTimerView timer={timer} />
          ) : null}
        </Box>
      ) : null}
      <Box w="100%" h="30%" overflow="hidden">
        <SubScreenCaptionView track={track} />
      </Box>
      <Box w="100%" h="10%" overflow="hidden">
        <SubScreenChatHeader />
      </Box>
      <Box w="100%" flexGrow={2}>
        <SubScreenChatView track={track} />
      </Box>
    </Flex>
  );
};

export default SubScreenPage;
