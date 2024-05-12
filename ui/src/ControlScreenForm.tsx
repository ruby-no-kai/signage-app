import React, { useEffect, useId, useState } from "react";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
// import { useHistory } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  HStack,
  Flex,
  Textarea,
  VStack,
  InputGroup,
  InputLeftElement,
  Center,
  Text,
  Tooltip,
  useToast,
  Select,
  UseDisclosureReturn,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";

import { Api, ScreenControl, ScreenControlFull, ScreenMode } from "./Api";
import { ErrorAlert, errorToToast } from "./ErrorAlert";
import { useApiContext } from "./ApiContext";

type FormData = {
  mode: ScreenMode;

  show_sessions: boolean;
  intermission: boolean;

  message: {
    heading: string;
    footer: string;
  };

  //nextSchedule: {
  //  enable: boolean;
  //  title: string;
  //  time: string;
  //  absoluteOnly: boolean;
  //};
};

function serverDataToFormData(input: ScreenControl): FormData {
  return {
    mode: input.mode,
    show_sessions: input.show_sessions,
    intermission: input.intermission,
    message: {
      heading: input.message?.heading ?? "",
      footer: input.message?.footer ?? "",
    },
  };
}

function formDataToInput(
  existing: ScreenControlFull,
  form: FormData
): ScreenControlFull {
  return {
    ...existing,
    mode: form.mode,
    show_sessions: form.show_sessions,
    intermission: form.intermission,
    message:
      form.mode === "message" || form.message.heading || form.message.footer
        ? form.message
        : undefined,
  };
}

export const ControlScreenForm: React.FC<{
  screen: ScreenControlFull;
  disclosureProps: UseDisclosureReturn;
}> = ({ screen, disclosureProps }) => {
  const aws = useApiContext(true);
  const toast = useToast();
  const { isOpen, onClose } = disclosureProps;
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    defaultValues: serverDataToFormData(screen),
  });
  const onSubmit = handleSubmit(async (data) => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      const card = formDataToInput(screen, data);
      console.log("draft to submit", card);
      await Api.updateScreenControl(aws, card);
      onClose();
    } catch (e) {
      toast(errorToToast(e));
    }
    setIsRequesting(false);
  });
  const screenMode = watch("mode");
  const tabList: ScreenMode[] = ["rotation", "message", "filler"];

  let tabIndex = tabList.indexOf(screenMode);
  if (tabIndex < 0) tabIndex = 0;

  const onTabChange = (i: number) => {
    if (!tabList[i]) throw "unknown tab index";
    setValue("mode", tabList[i]);
  };

  return (
    <Modal
      size="3xl"
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Compose Announcement</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box as="form" onSubmit={onSubmit} p={1} backgroundColor="white">
            <Tabs
              variant="soft-rounded"
              index={tabIndex}
              onChange={onTabChange}
            >
              <TabList>
                <Tab>Rotation mode</Tab>
                <Tab>Message mode</Tab>
                <Tab>Filler mode</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <FormControl>
                    <FormLabel>Show sessions</FormLabel>
                    <Checkbox {...register("show_sessions")} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Intermission (hide captions)</FormLabel>
                    <Checkbox {...register("intermission")} />
                  </FormControl>
                </TabPanel>

                <TabPanel>
                  <FormControl>
                    <FormLabel>Heading</FormLabel>
                    <Textarea {...register("message.heading")} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Footer</FormLabel>
                    <Textarea {...register("message.footer")} />
                  </FormControl>
                </TabPanel>

                <TabPanel>
                  <Text>There's no option for filler mode :)</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <FormControl>
              <Button type="submit" colorScheme="teal" isLoading={isRequesting}>
                Save
              </Button>
            </FormControl>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ControlScreenForm;
