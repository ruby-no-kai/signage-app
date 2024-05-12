import React, { useState } from "react";

import {
  Flex,
  Box,
  Skeleton,
  Tag,
  useDisclosure,
  IconButton,
} from "@chakra-ui/react";
import { Heading, Text } from "@chakra-ui/react";

import {
  Api,
  ScreenControl,
  ScreenControlFull,
  ScreenControlMessage,
  guardScreenMode,
} from "./Api";
//import ControlScreenForm from "./ControlScreenForm";
import { useApiContext } from "./ApiContext";
import { Colors } from "./theme";
import { EditIcon } from "@chakra-ui/icons";
import ControlScreenForm from "./ControlScreenForm";

export const ControlScreenPage: React.FC = () => {
  const { data: config } = Api.useConfig();
  const aws = useApiContext(true);
  const { data: screens } = Api.useScreenControls(aws);

  if (!config || !screens)
    return (
      <Box>
        <Skeleton />
      </Box>
    );

  return (
    <Flex direction="row" flexWrap="wrap" w="100%">
      {config.all_tracks.map((slug) => {
        const maybeScreen = screens.get(slug);
        return (
          <Box
            border="1px solid"
            borderColor={Colors.chatBorder2}
            backgroundColor="white"
            key={slug}
            w={["100%", "100%", "auto", "auto"]}
            flexGrow={1}
            minW={["auto", "auto", "320px", "330px"]}
            mt={3}
            mx={[3, 3, 1, 1]}
          >
            {maybeScreen ? (
              <ScreenControlView screen={maybeScreen} />
            ) : (
              <Text>[BUG] Unknown for track: {slug}</Text>
            )}
          </Box>
        );
      })}
    </Flex>
  );

  //  return <Box>{/*<ControlScreenForm />*/}</Box>;
};

const ScreenControlView: React.FC<{ screen: ScreenControl | undefined }> = ({
  screen,
}) => {
  if (!screen) return <Skeleton />;

  const mode =
    {
      rotation: "Rotation",
      message: "Message",
      filler: "Filler",
    }[guardScreenMode(screen.mode)] ?? "unknown";

  return (
    <>
      <Flex justifyContent="space-between" direction="row">
        <Heading as="h4" size="m">
          {screen.track}
        </Heading>

        <Box>
          <ScreenEditAction screen={screen} />
          {/*isActionable !== false && card.id >= 0 ? (
            <>
              {card.id >= 0 && !isActivated ? <CardRemoveAction card={card} /> : null}
              <CardCopyAction card={card} />
            </>
            ) : null*/}
        </Box>
      </Flex>

      <Text>Mode: {mode}</Text>

      {screen.intermission ? (
        <Text>
          <Tag variant="solid" colorScheme="teal">
            Intermission (hide caption)
          </Tag>
        </Text>
      ) : null}
      {screen.rotated_views.indexOf("venue_announcements") < 0 ? (
        <Text>
          <Tag variant="solid" colorScheme="teal">
            Hide venue anns
          </Tag>
        </Text>
      ) : null}
      {screen.rotated_views.indexOf("sessions") < 0 ? (
        <Text>
          <Tag variant="solid" colorScheme="teal">
            Hide schedule information
          </Tag>
        </Text>
      ) : null}
      {/* screen.lightning_timer ? (
        <Text>
          <Tag variant="solid" colorScheme="teal">
            LightningTimer Set
          </Tag>
        </Text>
        ) : null*/}

      {screen.mode === "message" && screen.message ? (
        <ScreenControlMessageView message={screen.message} />
      ) : null}
    </>
  );
};

const ScreenControlMessageView: React.FC<{ message: ScreenControlMessage }> = ({
  message,
}) => {
  return (
    <>
      {message.heading ? (
        <>
          <Heading as="div" fontSize="1.2rem" fontWeight="bold">
            Heading
          </Heading>
          <Text>{message.heading}</Text>
        </>
      ) : null}
      {message.footer ? (
        <>
          <Heading as="div" fontSize="1.2rem" fontWeight="bold">
            Footer
          </Heading>
          <Text>{message.footer}</Text>
        </>
      ) : null}
      {/*screen.next_schedule
        ? ((schedule) => {
            const ts = dayjs.unix(schedule.at);
            return (
              <>
                <Heading as="div" fontSize="1.2rem" fontWeight="bold">
                  Next Schedule
                </Heading>

                <Text>{schedule.title}</Text>
                <Text>Happens at: {ts.format()}</Text>
                {schedule.absolute_only ? (
                  <Text>Relative time turned off;</Text>
                ) : null}
              </>
            );
          })(screen.next_schedule)
              : null*/}
    </>
  );
};

const ScreenEditAction: React.FC<{ screen: ScreenControlFull }> = ({
  screen,
}) => {
  const disclosureProps = useDisclosure();
  const { onOpen, isOpen } = disclosureProps;

  return (
    <>
      <IconButton
        background="transparent"
        icon={<EditIcon boxSize="14px" />}
        minW="30px"
        w="30px"
        h="30px"
        aria-label="Edit"
        onClick={onOpen}
      />
      {isOpen ? (
        <ControlScreenForm screen={screen} disclosureProps={disclosureProps} />
      ) : null}
    </>
  );
};

export default ControlScreenPage;
