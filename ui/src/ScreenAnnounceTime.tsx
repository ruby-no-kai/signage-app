import React from "react";
import * as dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";
import type { Dayjs } from "dayjs";
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

import { HStack, VStack, Flex, Box, Text } from "@chakra-ui/react";
import { useTick } from "./TickProvider";

const TIME_ZONES = [
  ["PT", "America/Los_Angeles"],
  ["ET", "America/New_York"],
  ["BST", "Europe/London"],
  ["CET", "Europe/Madrid"],
];

export const ScreenAnnounceTime: React.FC<{ unix: number }> = ({ unix }) => {
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % TIME_ZONES.length;
      setIdx(i);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [tzName, tz] = TIME_ZONES[idx]!;

  const t = dayjs.unix(unix);
  return (
    <VStack>
      <HStack spacing="2vw">
        <AnnounceTimeItem tz={tzName} t={t.tz(tz)} />
        <AnnounceTimeItem tz={"UTC"} t={t.utc()} />
        <AnnounceTimeItem tz={"JST"} t={t.tz("Asia/Tokyo")} />
      </HStack>
    </VStack>
  );
};

const AnnounceTimeItem: React.FC<{ tz: string; t: Dayjs }> = ({ tz, t }) => {
  return (
    <VStack spacing="0.6vw">
      <Text fontWeight="500" fontSize="1.6vw" lineHeight="1.8vw">
        {tz}
      </Text>
      <Text fontWeight="700" fontSize="3.2vw" lineHeight="3.8vw">
        {t.format("HH:mm")}
      </Text>
    </VStack>
  );
};

function getRelativeTime(now: dayjs.Dayjs, t: number) {
  const x = dayjs.unix(t);
  if (now.isAfter(x)) {
    return "";
  } else {
    return x.from(now);
  }
}

export function useRelativeTime(t: number | undefined) {
  const tick = useTick();
  if (!t) return undefined;
  return getRelativeTime(tick, t);
}
