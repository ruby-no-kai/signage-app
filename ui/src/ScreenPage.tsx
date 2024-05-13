import React, { ReactNode } from "react";

import { Flex, Box, HStack } from "@chakra-ui/react";
import { AspectRatio } from "@chakra-ui/react";

import Api, { ScreenMode } from "./Api";
import { useKioskContext } from "./KioskProvider";
import { useApiContext } from "./ApiContext";
import { TickProvider } from "./TickProvider";

import { Colors, ScreenColors } from "./theme";

import { ScreenSponsorRotation } from "./ScreenSponsorRotation";
import { ScreenHeroFiller } from "./ScreenHeroFiller";
import { ScreenRotationView } from "./ScreenRotationView";
import ScreenMessageView from "./ScreenMessageView";
import { Logo } from "./Logo";

export const ScreenPage: React.FC = () => {
  return (
    <TickProvider>
      <Box w="100vw" h="auto">
        <AspectRatio ratio={16 / 9}>
          <Box bgColor={ScreenColors.bg} bgSize="contain" w="100%" h="100%">
            <IntermissionScreenInner />
          </Box>
        </AspectRatio>
      </Box>
    </TickProvider>
  );
};

const NahaThemedLetterBox: React.FC<{
  children?: ReactNode;
  letterBoxBgColor?: string;
}> = ({ children, letterBoxBgColor }) => {
  return (
    <Flex
      h="100%"
      w="100%"
      justify="space-around"
      direction="column"
      bgColor={letterBoxBgColor ?? ScreenColors.accent}
    >
      <Flex
        h="46vw"
        w="100%"
        justify="space-between"
        direction="row"
        bgColor={ScreenColors.bg}
      >
        {children}
      </Flex>
    </Flex>
  );
};

export const NahaThemedFillerPaddingX: React.FC<{ mode: ScreenMode }> = ({
  mode,
}) => {
  return (
    <Box w="5vw" flexGrow={2}>
      {mode === "filler" ? (
        // fixme: unused code
        <Box w="100%" h="100%" bgColor={ScreenColors.accent}></Box>
      ) : (
        <NahaThemedLetterBox>{/* padding X */}</NahaThemedLetterBox>
      )}
    </Box>
  );
};

export const IntermissionScreenInner: React.FC = () => {
  const apictx = useApiContext(false);
  const kioskParams = useKioskContext();
  const { data: screen } = Api.useScreenControl(apictx, kioskParams.track);

  if (!screen) return <p>Loading screen control</p>;

  console.log("IntermissionScreenInner/screen", screen);
  return (
    <>
      <Flex h="100%" w="100%" direction="row" bgColor={ScreenColors.bg}>
        {screen.mode !== "filler" ? (
          <NahaThemedFillerPaddingX mode={screen.mode} />
        ) : null}

        <Box h="100%" w="100%" flexGrow={3}>
          <NahaThemedLetterBox>
            {screen.mode === "message" && screen.message ? (
              <ScreenMessageView screen={screen} />
            ) : null}
            {screen.mode === "rotation" ? <ScreenRotationView /> : null}
            {screen.mode === "filler" ? (
              <Box w="100%" h="100%" bgColor={ScreenColors.accent}>
                <ScreenHeroFiller />
              </Box>
            ) : null}
          </NahaThemedLetterBox>
        </Box>
        {screen.show_sponsors ? (
          <Box h="100%">
            <NahaThemedLetterBox
              letterBoxBgColor={
                screen.mode === "filler" ? ScreenColors.bg : undefined
              }
            >
              <ScreenSponsorRotation />
            </NahaThemedLetterBox>
          </Box>
        ) : null}
        {screen.mode !== "filler" ? (
          <NahaThemedFillerPaddingX mode={screen.mode} />
        ) : null}
      </Flex>
      <>
        {/* Bottom-left 'RubyKaigi 2024' logo */}
        <Box
          display={screen.mode === "filler" ? "none" : "block"}
          position="absolute"
          top="52vw"
          left="3vw"
          w="auto"
          h="3vw"
          css={{
            "& svg": { height: "100%", width: "auto" },
            "& img": { height: "100%", width: "auto" },
          }}
        >
          <Logo />
        </Box>
      </>
    </>
  );
};
