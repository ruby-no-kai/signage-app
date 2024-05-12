import React from "react";

import { Center, VStack, Image } from "@chakra-ui/react";

export const ScreenHeroFiller: React.FC = () => {
  return (
    <Center w="100%" h="100%">
      <VStack
        spacing="3vw"
        css={{
          "& svg": { height: "auto", width: "100%" },
          "& img": { height: "auto", width: "100%" },
        }}
        w="90%"
      >
        <Image src={`/hero.svg?p=1`} />
        {/*
        <Image src="/assets/hero_hamburger.webp" h="30vw" />
        <Logo />*/}
      </VStack>
    </Center>
  );
};
