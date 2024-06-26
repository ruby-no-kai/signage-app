import React from "react";

import { Flex, Box, Text } from "@chakra-ui/react";

import type { VenueAnnouncement } from "./Api";
//import { Colors } from "./theme";
import { Logo } from "./Logo";
import { QRCodeSVG } from "qrcode.react";
import { ScreenFonts } from "./theme";

export const ScreenVenueAnnouncementView: React.FC<{
  ann: VenueAnnouncement;
}> = ({ ann }) => {
  // XXX: dupe with ScreenAnnounceView Inner
  return (
    <Flex minW="45vw" w="100%" h="100%" direction="column">
      <Flex
        w="100%"
        h="100%"
        direction="column"
        justify="space-between"
        textAlign="left"
      >
        <Flex
          w="100%"
          flexGrow={1}
          flexShrink={0}
          flexBasis={0}
          direction="column"
          justify="space-around"
          fontFamily={ScreenFonts.body}
          ml="1vw"
        >
          <Text fontWeight="500" fontSize="3vw" lineHeight="5vw">
            {returnToBr(ann.content)}
          </Text>
        </Flex>
        {ann.url ? (
          <Flex h="16vw" direction="row">
            <Box
              css={{ "& svg": { height: "100%", width: "auto" } }}
              bgColor="white"
            >
              <QRCodeSVG
                value={ann.url}
                level={"M"}
                includeMargin={true}
                size={300}
              />
            </Box>
            <Flex
              textAlign="left"
              h="100%"
              direction="column"
              justify="space-around"
              ml="1vw"
              fontSize="1.5vw"
              lineHeight="2vw"
              textDecoration="underline"
              fontFamily={ScreenFonts.body}
            >
              <Text>{ann.url}</Text>
            </Flex>
          </Flex>
        ) : null}
      </Flex>
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

export default ScreenVenueAnnouncementView;
