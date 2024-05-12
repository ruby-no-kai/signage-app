import React from "react";
import * as dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

import {
  HStack,
  VStack,
  Heading,
  Flex,
  Box,
  Image,
  Text,
} from "@chakra-ui/react";

import { Center } from "@chakra-ui/react";

import { Api, ConferenceSession, Speaker } from "./Api";
import { Colors, Fonts } from "./theme";
import { Logo } from "./Logo";

import { ScreenHeroFiller } from "./ScreenHeroFiller";

import { useRelativeTime } from "./ScreenAnnounceTime";
import { useApiContext } from "./ApiContext";
import { useTick } from "./TickProvider";

import { SpeakerAvatar } from "./SpeakerAvatar";
import { GitHubIcon } from "./GitHubIcon";
import { TwitterIcon } from "./TwitterIcon";

type ConferenceStateAssumption =
  | "break"
  | "in_session"
  | "mixed"
  | "end_of_day";

export const ScreenSessionsView: React.FC = () => {
  const tick = useTick();
  const recentSessions = useRecentSessions();

  let earliestStartUnix = undefined;
  if (recentSessions) {
    for (const [, s] of recentSessions.entries())
      if (
        s &&
        (earliestStartUnix === undefined || s.starts_at < earliestStartUnix)
      )
        earliestStartUnix = s.starts_at;
  }
  const relativeTime = useRelativeTime(earliestStartUnix);

  if (!recentSessions) return <ScreenHeroFiller />; // FIXME:

  const state: ConferenceStateAssumption | undefined = (() => {
    if (!recentSessions) return undefined;
    let allTomorrow = true;
    let allUndefined = true;
    for (const [, s] of recentSessions.entries()) {
      if (s) allTomorrow &&= tick.date() !== dayjs.unix(s.starts_at).date();
      allUndefined &&= s === undefined;
    }
    if (allTomorrow || allUndefined) return "end_of_day";

    let allStartedAndNotFinished = true;
    for (const [, s] of recentSessions.entries()) {
      if (s)
        allStartedAndNotFinished &&=
          dayjs.unix(s.starts_at).isBefore(tick) &&
          tick.isBefore(dayjs.unix(s.ends_at));
    }
    if (allStartedAndNotFinished) return "in_session";

    let allNotStarted = true;
    for (const [, s] of recentSessions.entries()) {
      if (s) allNotStarted &&= tick.isBefore(dayjs.unix(s.starts_at));
    }
    if (allNotStarted) return "break";

    return "mixed";
  })();

  //console.log("ScreenSessionsView/state", state);

  if (state === "end_of_day") return <ScreenHeroFiller />; // FIXME:

  return (
    <Flex
      w="100%"
      h="100%"
      direction="column"
      justify="space-around"
      textAlign="center"
    >
      <VStack w="100%" spacing="1vw">
        <Text fontWeight="500" fontSize="2.0vw" lineHeight="2.2vw">
          {state === "in_session" ? <>Ongoing Sessions</> : null}
          {state === "break" ? <>Next sessions {relativeTime}</> : null}
          {state === "mixed" ? <>Current and Upcoming Sessions</> : null}
        </Text>

        {/*<AnnounceTime unix={earliestStartUnix} />*/}
      </VStack>

      {Array.from(recentSessions.entries()).map(([track, s]) =>
        s ? <AnnounceUpcomingTopic key={track} session={s} /> : null
      )}
    </Flex>
  );
};

function useRecentSessions() {
  const apictx = useApiContext(false);
  const tick = useTick();
  const { data: conferenceSessions } = Api.useConferenceSessions(apictx);

  if (!conferenceSessions) return undefined;
  if (!apictx) return undefined;

  const retval = new Map(
    apictx.config.tracks.map((track) => {
      const trackSessions = conferenceSessions.tracks.get(track) ?? [];
      const firstUnfinishedSession = trackSessions.find(
        (s) => tick.unix() <= s.ends_at
      );
      return [track, firstUnfinishedSession];
    })
  );
  //console.log("useRecentSessions", retval);
  return retval;
}

const AnnounceUpcomingTopic: React.FC<{ session: ConferenceSession }> = ({
  session,
}) => {
  return (
    <Box textAlign="left">
      {/* TODO: missing room name */}
      <Text fontWeight="500" fontSize="1.8vw" lineHeight="2.3vw" mb="1.1vw">
        {session.hall}
      </Text>
      <HStack alignItems="top" spacing="0.7vw" textAlign="left">
        {session.speakers && session.speakers.length > 0 ? (
          <Box w="100%" maxW="7vw">
            <SpeakerAvatar speakers={session.speakers} />
          </Box>
        ) : null}
        <Box as="div">
          <Heading as="h2" fontSize="2.1vw" lineHeight="2.5vw" fontWeight="700">
            {session.title}
          </Heading>
          {session.speakers && session.speakers.length > 0 ? (
            <Box>
              {session.speakers.map((s) => (
                <ScreenTopicSpeaker key={s.avatar_url} speaker={s} />
              ))}
            </Box>
          ) : null}
        </Box>
      </HStack>
    </Box>
  );
};

const ScreenTopicSpeaker: React.FC<{ speaker: Speaker }> = ({ speaker }) => {
  const primaryAlias = speaker.github_id || speaker.twitter_id;
  const primaryIcon =
    (speaker.github_id && <GitHubIcon boxSize="1.55vw" m={0} />) ||
    (speaker.twitter_id && <TwitterIcon boxSize="1.55vw" m={0} />);
  return (
    <HStack
      as="p"
      spacing="1vw"
      fontWeight="500"
      fontSize="1.6vw"
      h="20px"
      lineHeight="2vw"
      mt="0.7vw"
    >
      <Text as="span">{speaker.name}</Text>
      {primaryIcon ? primaryIcon : null}
      {primaryAlias ? (
        <Text as="span" m={0}>
          @{primaryAlias}
        </Text>
      ) : null}
    </HStack>
  );
};
