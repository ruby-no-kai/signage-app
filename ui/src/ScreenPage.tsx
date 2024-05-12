import React from "react";

import { Flex, Box } from "@chakra-ui/react";
import { AspectRatio } from "@chakra-ui/react";

import Api from "./Api";
import { useKioskContext } from "./KioskProvider";
import { useApiContext } from "./ApiContext";
import { TickProvider } from "./TickProvider";

import { Colors } from "./theme";

import { ScreenSponsorRotation } from "./ScreenSponsorRotation";
import { ScreenHeroFiller } from "./ScreenHeroFiller";
import { ScreenRotationView } from "./ScreenRotationView";
import ScreenMessageView from "./ScreenMessageView";

export const ScreenPage: React.FC = () => {
  return (
    <TickProvider>
      <Box w="100vw" h="auto">
        <AspectRatio ratio={16 / 9}>
          <Box bgColor={Colors.bg} bgSize="contain" w="100%" h="100%" p="2.5vw">
            <IntermissionScreenInner />
          </Box>
        </AspectRatio>
      </Box>
    </TickProvider>
  );
};

export const IntermissionScreenInner: React.FC = () => {
  const apictx = useApiContext(false);
  const kioskParams = useKioskContext();
  const { data: screen } = Api.useScreenControl(apictx, kioskParams.track);

  if (!screen) return <p>Loading screen control</p>;

  console.log("IntermissionScreenInner/screen", screen);
  return (
    <Flex h="100%" w="100%" justify="space-between" direction="row">
      <Box h="100%">
        {screen.mode === "message" && screen.message ? (
          <ScreenMessageView screen={screen} />
        ) : null}
        {screen.mode === "rotation" ? <ScreenRotationView /> : null}
        {screen.mode === "filler" ? <ScreenHeroFiller /> : null}
      </Box>
      <Box h="100%">
        <ScreenSponsorRotation />
      </Box>
    </Flex>
  );
};
