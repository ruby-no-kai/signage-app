import React, { useState } from "react";
import dayjs from "dayjs";

import { VStack, Flex, Box, Image, Text } from "@chakra-ui/react";
import { Center } from "@chakra-ui/react";

import { Api, ConferenceSponsorship, ConferenceSponsorshipPlan } from "./Api";
import { Fonts } from "./theme";
import { useApiContext } from "./ApiContext";
import { useTick } from "./TickProvider";

type RotationPage = {
  plan: ConferenceSponsorshipPlan;
  items: ConferenceSponsorship[];
};

export const ScreenSponsorRotation: React.FC = () => {
  const pages = useSponsorLogoPages();
  const page = useRotatingPage(pages);

  if (!page) return <></>;
  if (!page.items[0]) return <></>;

  return (
    <Box w="45vw" h="100%" px="6vw" pt="4vw" bgColor="#ffffff">
      <Center>
        <VStack spacing="2.8vw">
          <Text
            fontWeight="500"
            fontSize="2vw"
            lineHeight="4.6vw"
            fontFamily={Fonts.heading}
          >
            Sponsored by
          </Text>

          <ScreenSponsorLogoSet page={page} />
        </VStack>
      </Center>
    </Box>
  );
};

const ScreenSponsorLogoSet: React.FC<{ page: RotationPage }> = ({ page }) => {
  if (page.plan === "ruby" && page.items[0]) {
    const sponsor = page.items[0];
    return <Image w="100%" h="100%" src={sponsor.avatar_url} />;
  } else if (page.plan === "platinum") {
    return (
      <Flex w="100%" h="100%" flexDirection="row" flexWrap="wrap">
        {page.items.map((s) => {
          return (
            <Box key={`${s.id}`} w="50%" p="0.6vw">
              <Image w="100%" h="auto" src={s.avatar_url} />
            </Box>
          );
        })}
      </Flex>
    );
  } else if (page.plan === "gold") {
    return (
      <Flex w="100%" h="100%" flexDirection="row" flexWrap="wrap">
        {page.items.map((s) => {
          return (
            <Box key={`${s.id}`} w="33%" p="0.6vw">
              <Image w="100%" h="auto" src={s.avatar_url} />
            </Box>
          );
        })}
      </Flex>
    );
  } else {
    return <></>;
  }
};

function useSponsorLogoPages() {
  const apictx = useApiContext(false);
  const { data: sponsors } = Api.useConferenceSponsorships(apictx);

  const pages = React.useMemo(() => {
    if (sponsors === undefined) return undefined;

    const sponsorsByPlan: Map<
      ConferenceSponsorshipPlan,
      ConferenceSponsorship[]
    > = new Map();
    const getSponsorsByPlan = (plan: ConferenceSponsorshipPlan) => {
      const cand = sponsorsByPlan.get(plan);
      if (cand) return cand;
      const l: ConferenceSponsorship[] = [];
      sponsorsByPlan.set(plan, l);
      return l;
    };

    sponsors.forEach((s) => {
      getSponsorsByPlan(s.plan).push(s);
      const img = new window.Image();
      img.src = s.avatar_url;
    });

    const newPages: RotationPage[] = [];

    const plans: ConferenceSponsorshipPlan[] = ["ruby", "platinum", "gold"];
    plans.forEach((plan) => {
      const ss = getSponsorsByPlan(plan);
      const size = {
        ruby: 1,
        platinum: 4,
        gold: 9,
        silver: null,
      }[plan];
      if (!size) return;
      for (let i = 0; i < ss.length; i += size) {
        newPages.push({
          plan: plan,
          items: ss.slice(i, i + size),
        });
      }
    });

    return newPages;
  }, [sponsors]);

  return pages;
}

const ROTATE_INTERVAL = 9;
function useRotatingPage(pages: RotationPage[] | undefined) {
  const tick = useTick();
  const [page, setPage] = useState<RotationPage | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  React.useEffect(() => {
    if (!pages) return;
    if (!pages[0]) return;

    const now = tick.unix();
    const idx = Math.floor(now / ROTATE_INTERVAL) % pages.length;

    if (idx !== index) {
      setIndex(idx);
      setPage(pages[idx]);
    }
  }, [pages, index, tick, setIndex, setPage]);
  return page;
}
