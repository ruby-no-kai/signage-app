import React from "react";

import { Center, VStack, Image, Box } from "@chakra-ui/react";

export const ScreenHeroFiller: React.FC = () => {
  return (
    <Center
      w="100%"
      h="100%"
      css={{
        "& svg": { height: "100%", width: "auto" },
        "& img": { height: "100%", width: "auto" },
      }}
    >
      <Image src={`/hero.svg?p=1`} />
    </Center>
  );
};
