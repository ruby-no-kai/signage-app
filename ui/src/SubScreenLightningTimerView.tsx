import React from "react";

import { Box, Flex } from "@chakra-ui/react";
import { LightningTimerStatus } from "./LightningTimer";
import { Fonts, ScreenFonts } from "./theme";

export const SubScreenLightningTimerView: React.FC<{
  timer: LightningTimerStatus;
}> = ({ timer }) => {
  return (
    <Flex w="100%" h="100%" direction="column" justify="space-around">
      <Box
        w="100%"
        fontSize="14vw"
        lineHeight="14vw"
        textAlign="center"
        fontFamily={ScreenFonts.timer}
        fontWeight={700}
      >
        {timer.m}:{timer.s}
      </Box>
    </Flex>
  );
};
