import React, { ReactNode, useId, useState } from "react";
import dayjs from "dayjs";

import {
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  Skeleton,
  Tag,
  Text,
  useToast,
} from "@chakra-ui/react";

import { Api, LightningTimer, ScreenControl, TrackSlug } from "./Api";
//import ControlScreenForm from "./ControlScreenForm";
import { useApiContext } from "./ApiContext";
import { Colors, Fonts } from "./theme";
import { TickProvider } from "./TickProvider";
import { LightningTimerStatus, useLightningTimer } from "./LightningTimer";
import { errorToToast } from "./ErrorAlert";
import { useForm } from "react-hook-form";

const ControlLightningTimerTrack: React.FC<{
  track: TrackSlug;
}> = ({ track }) => {
  const apictx = useApiContext(true);
  const { data: screen } = Api.useScreenControl(apictx, track);
  const undoState = useState<undefined | LightningTimer>(undefined);

  if (!screen) return <Skeleton />;

  return (
    <TickProvider>
      <TimerStatus screen={screen} undoState={undoState} />
      <NewTimerForm screen={screen} undoState={undoState} />
    </TickProvider>
  );
};

const TimerText: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Flex minH="8rem" direction="column" justify="space-around" mb={6}>
      <Flex w="100%" h="100%" direction="column" justify="space-around">
        <Box
          w="100%"
          fontSize="2rem"
          lineHeight="2.5rem"
          textAlign="center"
          fontFamily={Fonts.heading}
          fontWeight={700}
        >
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};

const TimerStatus: React.FC<{
  screen: ScreenControl;
  undoState: ReturnType<typeof useState<undefined | LightningTimer>>;
}> = ({ screen, undoState }) => {
  const timer = useLightningTimer(screen.lightning_timer);

  if (!timer) return <TimerText>Timer not set</TimerText>;

  return (
    <>
      <Box textAlign={["left", "left", "center", "center"]}>
        <TimerText>
          {timer.m}:{timer.s}
        </TimerText>

        <Text>
          {!timer.shouldVisible ? (
            <Tag variant="solid" colorScheme="gray" mr={1}>
              Not Visible
            </Tag>
          ) : null}
          {!timer.isEnabled ? (
            <Tag variant="solid" colorScheme="red" mr={1}>
              Manually Halted
            </Tag>
          ) : null}
          {timer.isExpired ? (
            <Tag variant="solid" colorScheme="yellow" mr={1}>
              Expired
            </Tag>
          ) : null}
          {timer.isStaticTick ? (
            <Tag variant="solid" colorScheme="orange" mr={1}>
              Paused
            </Tag>
          ) : timer.isCompleted ? (
            <Tag variant="solid" colorScheme="green" mr={1}>
              Finished
            </Tag>
          ) : (
            <Tag variant="solid" colorScheme="gray" mr={1}>
              Running
            </Tag>
          )}
        </Text>

        <Text>
          <b>Started at:</b> {timer.startsAt.format()}
          <br />
          <b>Ends at:</b> {timer.endsAt.format()}
          <br />
          <b>Expires at:</b> {timer.expiresAt.format()}
        </Text>

        <TimerActions timer={timer} screen={screen} undoState={undoState} />
      </Box>
    </>
  );
};

const TimerActions: React.FC<{
  timer: LightningTimerStatus;
  screen: ScreenControl;
  undoState: ReturnType<typeof useState<undefined | LightningTimer>>;
}> = ({ timer, screen, undoState }) => {
  const toast = useToast();
  const apictx = useApiContext(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [undoBuffer, setUndoBuffer] = undoState;

  const onUndo = () => {
    if (!apictx) return;
    if (!undoBuffer) return;
    if (isRequesting) return;
    const newUndoBuffer = timer.settings;
    Api.updateScreenControl(apictx, {
      ...screen,
      lightning_timer: { ...undoBuffer },
    })
      .then((v) => {
        console.log("timer state rewinded", v);
        setIsRequesting(false);
        setUndoBuffer(newUndoBuffer);
      })
      .catch((e) => {
        setIsRequesting(false);
        toast(errorToToast(e));
      });
  };

  const submitPatch = (patchFn: () => Partial<LightningTimer> | undefined) => {
    return () => {
      if (!apictx) return;
      if (isRequesting) return;
      const patch = patchFn();
      if (!patch) return;

      const newUndoBuffer = timer.settings;
      Api.updateScreenControl(apictx, {
        ...screen,
        lightning_timer: { ...timer.settings, ...patch },
      })
        .then((v) => {
          console.log("timer updated", v);
          setIsRequesting(false);
          setUndoBuffer(newUndoBuffer);
        })
        .catch((e) => {
          setIsRequesting(false);
          toast(errorToToast(e));
        });
    };
  };

  const onDisable = submitPatch(() => ({ enabled: false }));
  const onPause = submitPatch(() => {
    const now = dayjs();
    return { tick: now.unix(), expires_at: now.unix() + EXPIRY * 2 };
  });
  const onResume = submitPatch(() => {
    const staticTick = timer.settings.tick;
    if (!staticTick) return;
    const now = dayjs();
    const newEndsAt = now.unix() + (timer.settings.ends_at - staticTick);
    return {
      tick: null,
      starts_at: now.unix(),
      ends_at: newEndsAt,
      expires_at: newEndsAt + EXPIRY,
    };
  });

  return (
    <Box textAlign={["left", "left", "center", "center"]} my={3}>
      <Text>
        <Button
          isDisabled={!apictx || !undoState}
          colorScheme="gray"
          onClick={onUndo}
          mr={2}
        >
          Undo
        </Button>
        <Button
          isDisabled={!apictx || !timer.shouldVisible}
          isLoading={isRequesting}
          colorScheme="red"
          onClick={onDisable}
          mr={2}
        >
          Disable and Hide
        </Button>
        {timer.isStaticTick ? (
          <Button
            isDisabled={!apictx || !timer.shouldVisible}
            isLoading={isRequesting}
            colorScheme="green"
            onClick={onResume}
          >
            Resume
          </Button>
        ) : (
          <Button
            isDisabled={!apictx || !timer.shouldVisible}
            isLoading={isRequesting}
            colorScheme="orange"
            onClick={onPause}
            mr={2}
          >
            Pause
          </Button>
        )}
      </Text>
    </Box>
  );
};

type FormData = { seconds: number };

const EXPIRY = 180;

const NewTimerForm: React.FC<{
  screen: ScreenControl;
  undoState: ReturnType<typeof useState<undefined | LightningTimer>>;
}> = ({ screen, undoState }) => {
  const formID = useId();
  const toast = useToast();
  const apictx = useApiContext(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [, setUndoBuffer] = undoState;

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      seconds: 300,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!apictx) return;
    if (isRequesting) return;
    setIsRequesting(true);
    const newUndoBuffer = screen.lightning_timer || undefined;
    try {
      const now = dayjs();
      const newTimer = {
        enabled: true,
        starts_at: now.unix(),
        ends_at: now.unix() + data.seconds,
        expires_at: now.unix() + data.seconds + EXPIRY,
      };
      console.log("newTimer", newTimer);
      await Api.updateScreenControl(apictx, {
        ...screen,
        lightning_timer: newTimer,
      });
      reset();
    } catch (e) {
      toast(errorToToast(e));
    }
    setUndoBuffer(newUndoBuffer);
    setIsRequesting(false);
  });

  return (
    <Box textAlign={["left", "left", "center", "center"]}>
      <HStack as="form" onSubmit={onSubmit} id={formID} w="auto">
        <FormControl w={["100%", "100%", "auto", "auto"]}>
          <InputGroup>
            <Input
              type="number"
              w={["100%", "100%", "200px", "200px"]}
              {...register("seconds", { valueAsNumber: true })}
            />
            <InputRightAddon>seconds</InputRightAddon>
          </InputGroup>
        </FormControl>
        <FormControl w="auto">
          <Button
            colorScheme="blue"
            ml={1}
            form={formID}
            flexGrow={[1, 1, 0, 0]}
            type="submit"
            isDisabled={!apictx}
            isLoading={isRequesting}
          >
            Start
          </Button>
        </FormControl>
      </HStack>
    </Box>
  );
};

export default ControlLightningTimerTrack;
