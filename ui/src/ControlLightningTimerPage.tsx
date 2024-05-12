import React, { useState } from "react";

import {
  Flex,
  Box,
  Skeleton,
  Tag,
  useDisclosure,
  IconButton,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Tab,
} from "@chakra-ui/react";
import { Text } from "@chakra-ui/react";

import { Api } from "./Api";
//import ControlScreenForm from "./ControlScreenForm";
import { Colors } from "./theme";
import ControlLightningTimerTrack from "./ControlLightningTimerTrack";

export const ControlLightningTimerPage: React.FC = () => {
  const { data: config } = Api.useConfig();

  if (!config)
    return (
      <Box>
        <Skeleton />
      </Box>
    );

  return (
    <Box>
      <Tabs variant="soft-rounded">
        <TabList>
          {config.tracks.map((slug) => (
            <Tab key={slug}>{slug}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {config.tracks.map((slug) => {
            return (
              <TabPanel>
                <Box
                  key={slug}
                  border="1px solid"
                  borderColor={Colors.chatBorder2}
                  backgroundColor="white"
                  w={["100%", "100%", "auto", "auto"]}
                  flexGrow={1}
                  minW={["auto", "auto", "320px", "330px"]}
                  mt={3}
                  mx={[3, 3, 1, 1]}
                  p={4}
                >
                  <ControlLightningTimerTrack track={slug} />
                </Box>
              </TabPanel>
            );
          })}
        </TabPanels>
      </Tabs>
    </Box>
  );

  //  return <Box>{/*<ControlScreenForm />*/}</Box>;
};
export default ControlLightningTimerPage;
