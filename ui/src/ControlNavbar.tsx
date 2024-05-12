import React from "react";
import { Colors } from "./theme";
import { Box, HStack, Flex, Heading, Text, Link } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

import Api from "./Api";

export const ControlNavbar: React.FC = () => {
  return (
    <Flex
      as="nav"
      justify="space-between"
      alignItems="center"
      w="100%"
      h="56px"
      px="15px"
      bgColor={Colors.bg}
    >
      <HStack spacing="14px">
        <Link as={RouterLink} to="/control/screens">
          Screens
        </Link>
        <Link as={RouterLink} to="/control/announcements">
          ANNs
        </Link>
        <Link as={RouterLink} to="/control/kiosks">
          Kiosks
        </Link>
      </HStack>
    </Flex>
  );
};
export default ControlNavbar;
