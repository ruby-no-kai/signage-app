import React from "react";

import { HStack, VStack, Flex, Box, Text } from "@chakra-ui/react";

import { Api, ScreenControl, ScreenControlMessage } from "./Api";
import { Colors, Fonts } from "./theme";
import { Logo } from "./Logo";

export const ScreenMessageView: React.FC<{
  screen: ScreenControl;
}> = ({ screen }) => {
  if (!screen?.message) throw "screen.message is mandatory";
  return (
    <Flex w="45vw" h="100%" direction="column">
      <Box css={{ "& svg": { height: "1.8vw", width: "auto" } }}>
        <Logo />
      </Box>
      <Box
        w="100%"
        flexGrow={1}
        flexShrink={0}
        flexBasis={0}
        fontFamily={Fonts.heading}
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
      textAlign="center"
    >
      {message.heading ? (
        <Text fontWeight="700" fontSize="4vw" lineHeight="6vw">
          {returnToBr(message.heading)}
        </Text>
      ) : null}
      {/*message.next_schedule ? (
        <AnnounceNextSchedule schedule={message.next_schedule} />
        ) : null*/}
      {message.footer ? (
        <Text fontWeight="500" fontSize="1.7vw" lineHeight="2vw">
          {returnToBr(message.footer)}
        </Text>
      ) : null}
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
