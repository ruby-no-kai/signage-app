import React, { useEffect, useId, useState } from "react";
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

import {
  Api,
  CaptionSource,
  SubscreenLayout,
  ScreenControl,
  ScreenControlFull,
  ScreenMode,
  ScreenViewKind,
} from "./Api";
import { ErrorAlert, errorToToast } from "./ErrorAlert";
import { useApiContext } from "./ApiContext";

type FormData = {
  mode: ScreenMode;

  show_hero: boolean;
  show_venue_announcements: boolean;
  show_sessions: boolean;

  show_sponsors: boolean;
  show_photo_sticker: boolean;

  main_caption: CaptionSource;

  subscreen_layout: SubscreenLayout;
  subscreen_caption: "" | "off" | CaptionSource;
  subscreen_caption_hide_partial: boolean;

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

    show_hero: input.rotated_views.indexOf("hero") >= 0,
    show_venue_announcements:
      input.rotated_views.indexOf("venue_announcements") >= 0,
    show_sessions: input.rotated_views.indexOf("sessions") >= 0,

    show_sponsors: input.show_sponsors,
    show_photo_sticker: input.show_photo_sticker ?? false,

    main_caption: input.main_caption ?? "refiner",

    subscreen_layout: input.subscreen_layout ?? "horizontal",
    subscreen_caption: input.subscreen_caption ?? "off",
    subscreen_caption_hide_partial:
      input.subscreen_caption_hide_partial ?? false,

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
  const rotated_views: ScreenViewKind[] = [];
  if (form.show_hero) rotated_views.push("hero");
  if (form.show_venue_announcements) rotated_views.push("venue_announcements");
  if (form.show_sessions) rotated_views.push("sessions");

  return {
    ...existing,
    mode: form.mode,
    rotated_views,
    show_sponsors: form.show_sponsors,
    show_photo_sticker: form.show_photo_sticker,
    intermission: form.intermission,
    main_caption: form.main_caption,
    subscreen_layout: form.subscreen_layout,
    subscreen_caption:
      form.subscreen_caption === "off" || form.subscreen_caption === ""
        ? undefined
        : form.subscreen_caption,
    subscreen_caption_hide_partial: form.subscreen_caption_hide_partial,
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
                    <FormLabel>Show hero filler</FormLabel>
                    <Checkbox {...register("show_hero")} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Show sessions</FormLabel>
                    <Checkbox {...register("show_sessions")} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Show venue announcements</FormLabel>
                    <Checkbox {...register("show_venue_announcements")} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Show photo sticker view</FormLabel>
                    <Checkbox {...register("show_photo_sticker")} />
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

                <TabPanel></TabPanel>
              </TabPanels>
            </Tabs>

            <FormControl>
              <FormLabel>Subscreen Layout</FormLabel>
              <Select {...register("subscreen_layout")}>
                <option value="horizontal">horizontal</option>
                <option value="vertical">vertical</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Subscreen Caption</FormLabel>
              <Select {...register("subscreen_caption")}>
                <option value="off">Off</option>
                <option value="refiner">Refiner</option>
                <option value="transcribe">Transcribe</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Subscreen Caption hides partial result</FormLabel>
              <Checkbox {...register("subscreen_caption_hide_partial")} />
            </FormControl>
            <FormControl>
              <FormLabel>Mainscreen Caption</FormLabel>
              <Select {...register("main_caption")}>
                <option value="refiner">Refiner</option>
                <option value="transcribe">Transcribe</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Intermission mode</FormLabel>
              <Checkbox {...register("intermission")} />
            </FormControl>
            <FormControl>
              <FormLabel>Show sponsor rotation</FormLabel>
              <Checkbox {...register("show_sponsors")} />
            </FormControl>

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
