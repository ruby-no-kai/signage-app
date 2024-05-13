import React from "react";

import { HStack, VStack, Flex, Box, Text } from "@chakra-ui/react";

import { Api, ScreenControl, ScreenControlMessage } from "./Api";
import { Colors, Fonts, ScreenFonts } from "./theme";
import { Logo } from "./Logo";

export const ScreenMessageView: React.FC<{
  screen: ScreenControl;
}> = ({ screen }) => {
  if (!screen?.message) throw "screen.message is mandatory";
  return (
    <Flex minW="45vw" w="100%" h="100%" direction="column">
      <Box
        w="100%"
        flexGrow={1}
        flexShrink={0}
        flexBasis={0}
        fontFamily={ScreenFonts.body}
      >
        {<AnnounceBasic message={screen.message} />}
      </Box>
    </Flex>
  );
};

const AnnounceBasic: React.FC<{ message: ScreenControlMessage }> = ({
  message,
}) => {
  return (
    <Flex
      w="100%"
      h="100%"
      direction="column"
      justify="space-around"
      color={Colors.textDefault}
      textAlign="left"
    >
      <Box>
        {message.heading ? (
          <Text
            fontWeight="400"
            fontSize="4vw"
            lineHeight="6vw"
            fontFamily={ScreenFonts.heading}
          >
            {returnToBr(message.heading)}
          </Text>
        ) : null}
        {/*message.next_schedule ? (
        <AnnounceNextSchedule schedule={message.next_schedule} />
        ) : null*/}
        {message.footer ? (
          <Text fontWeight="500" fontSize="1.7vw" lineHeight="2vw" mt="3vw">
            {returnToBr(message.footer)}
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
};

// XXX: returnToBr dupe
function returnToBr(text: string) {
  const elems = text
    .split("\n")
    .flatMap((v, i) => [
      <React.Fragment key={`${i}t`}>{v}</React.Fragment>,
      <br key={`${i}b`} />,
    ]);
  elems.pop();
  return elems;
}

export default ScreenMessageView;
