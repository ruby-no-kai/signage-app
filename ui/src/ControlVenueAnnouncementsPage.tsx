import React, { useState, useId } from "react";
import loadable from "@loadable/component";

import {
  Box,
  Flex,
  Tag,
  Text,
  useToast,
  Button,
  UseDisclosureReturn,
  useDisclosure,
  Heading,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  PopoverAnchor,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  VStack,
  Input,
  Textarea,
  FormLabel,
  FormControl,
  Checkbox,
  Link,
} from "@chakra-ui/react";

import { ErrorAlert, errorToToast } from "./ErrorAlert";

import {
  Api,
  KioskKind,
  VenueAnnouncement,
  VenueAnnouncementInput,
} from "./Api";
import { Colors } from "./theme";
import { DeleteIcon } from "./DeleteIcon";
import { EditIcon } from "@chakra-ui/icons";
import { useApiContext } from "./ApiContext";

export const ControlVenueAnnouncementsPage: React.FC = () => {
  const aws = useApiContext(true);
  const { data, error } = Api.useVenueAnnouncements(aws);

  if (!aws || !data)
    return <p>{error ? <ErrorAlert error={error} /> : null}Loading..</p>;
  return (
    <Box mx="50px">
      {error ? <ErrorAlert error={error} /> : null}
      <Box>
        <Heading>ANNs</Heading>
      </Box>
      <Box>
        <ControlVenueAnnouncementForm />
      </Box>
      <Box>
        {data.map((ann) => (
          <ControlVenueAnnouncementView key={ann.id} venueAnnouncement={ann} />
        ))}
      </Box>
    </Box>
  );
};

export const ControlVenueAnnouncementView: React.FC<{
  venueAnnouncement: VenueAnnouncement;
}> = ({ venueAnnouncement: ann }) => {
  const editDisclosureProps = useDisclosure();
  return (
    <Box
      border="1px solid"
      borderColor={Colors.chatBorder2}
      backgroundColor="white"
    >
      <Flex justifyContent="space-between" direction="row">
        <Box>
          <IconButton
            background="transparent"
            icon={<EditIcon boxSize="14px" />}
            minW="30px"
            w="30px"
            h="30px"
            aria-label="Edit"
            onClick={editDisclosureProps.onOpen}
          />
          <ControlVenueAnnouncementForm
            target={ann}
            disclosureProps={editDisclosureProps}
          />
        </Box>
        <Box>
          <VenueAnnouncementRemoval venueAnnouncement={ann} />
        </Box>
      </Flex>
      <Text>{returnToBr(ann.content)}</Text>
      {ann.url ? (
        <Text>
          <b>Link: </b>
          <Link isExternal href={ann.url}>
            {ann.url}
          </Link>
        </Text>
      ) : null}
      <Text>
        <Tag size="md" variant="solid" colorScheme="gray">
          {ann.order_index}
        </Tag>

        {ann.enabled ? (
          <Tag size="md" variant="solid" colorScheme="teal">
            Enabled
          </Tag>
        ) : (
          <Tag size="md" variant="solid" colorScheme="gray">
            Disabled
          </Tag>
        )}
        {ann.applicable_kiosks?.includes("track") ? (
          <Tag size="md" variant="solid" colorScheme="teal">
            Track (Intermission) Only
          </Tag>
        ) : null}
        {ann.applicable_kiosks?.includes("subscreen") ? (
          <Tag size="md" variant="solid" colorScheme="teal">
            Subscreen Only
          </Tag>
        ) : null}
        {ann.applicable_kiosks?.includes("hallway") ? (
          <Tag size="md" variant="solid" colorScheme="teal">
            Hallway Only
          </Tag>
        ) : null}
      </Text>
    </Box>
  );
};

const VenueAnnouncementRemoval: React.FC<{
  venueAnnouncement: VenueAnnouncement;
}> = ({ venueAnnouncement: ann }) => {
  const aws = useApiContext(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const toast = useToast();
  const perform = () => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);
    Api.deleteVenueAnnouncement(aws, ann)
      .then(() => {
        setIsRequesting(false);
      })
      .catch((e) => {
        setIsRequesting(false);
        toast(errorToToast(e));
      });
  };
  return (
    <Popover closeOnBlur matchWidth>
      <PopoverTrigger>
        <IconButton
          background="transparent"
          icon={<DeleteIcon boxSize="14px" />}
          minW="30px"
          w="30px"
          h="30px"
          aria-label="Delete"
          type="submit"
        />
      </PopoverTrigger>
      <PopoverContent w="100px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>Sure?</PopoverHeader>
        <PopoverBody>
          <Button
            colorScheme="red"
            size="sm"
            onClick={perform}
            isLoading={isRequesting}
            isDisabled={!aws}
          >
            Remove
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

type KioskKindTicks = {
  only_subscreen: boolean;
  only_hallway: boolean;
  only_track: boolean;
};

// FIXME: prerendered form doesn't change its value after background mutation

const ControlVenueAnnouncementForm: React.FC<{
  target?: VenueAnnouncement;
  disclosureProps?: UseDisclosureReturn;
  nextOrder?: number;
}> = ({ target, disclosureProps }) => {
  const aws = useApiContext(true);
  const formID = useId();
  const toast = useToast();
  const defaultDisclosure = useDisclosure();
  const { isOpen, onOpen, onClose } = disclosureProps ?? defaultDisclosure;
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);
  const { data } = Api.useVenueAnnouncements(aws);
  const nextOrder = (data?.slice(-1)?.order_index ?? 0) + 1;

  const { register, handleSubmit, reset, watch, setValue } = useForm<
    Omit<VenueAnnouncementInput, "applicable_kiosks"> & KioskKindTicks
  >({
    defaultValues: target ?? {
      enabled: true,
      content: "",
      url: "",
      order_index: nextOrder,
      only_subscreen: false,
      only_hallway: false,
      only_track: false,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);

    const applicable_kiosks: KioskKind[] = [];
    if (data.only_subscreen) applicable_kiosks.push("subscreen");
    if (data.only_hallway) applicable_kiosks.push("hallway");
    if (data.only_track) applicable_kiosks.push("track");
    const input: VenueAnnouncementInput = { ...data };
    if (applicable_kiosks.length > 0)
      input.applicable_kiosks = applicable_kiosks;

    try {
      const resp = await (target
        ? Api.updateVenueAnnouncement(aws, { ...target, ...input })
        : Api.createVenueAnnouncement(aws, input));
      console.log("resp", resp);
      setIsRequesting(false);
      onClose();
    } catch (e) {
      toast(errorToToast(e));
    }
  });

  return (
    <>
      {disclosureProps ? null : (
        <>
          <Button onClick={onOpen}>Compose</Button>
        </>
      )}

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
            <VStack as="form" w="100%" onSubmit={onSubmit} id={formID}>
              <FormControl>
                <FormLabel>Order </FormLabel>
                <Input type="number" {...register("order_index")} />
              </FormControl>
              <FormControl>
                <FormLabel>Content</FormLabel>
                <Textarea
                  w="100%"
                  minH="200px"
                  fontSize="14px"
                  {...register("content")}
                />
              </FormControl>
              <FormControl>
                <FormLabel>URL to link</FormLabel>
                <Input type="text" {...register("url")} />
              </FormControl>
              <FormControl>
                <Checkbox {...register("enabled")}>Enable</Checkbox>
              </FormControl>
              <FormControl>
                <Checkbox {...register("only_track")}>
                  Track (Intermission) Only
                </Checkbox>
              </FormControl>
              <FormControl>
                <Checkbox {...register("only_subscreen")}>
                  Subscreen Only
                </Checkbox>
              </FormControl>
              <FormControl>
                <Checkbox {...register("only_hallway")}>Hallway Only</Checkbox>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              form={formID}
              type="submit"
              isLoading={isRequesting}
              isDisabled={!aws}
            >
              Send
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
// XXX: returnToBr dupe
function returnToBr(text: string) {
  const elems = text
    .split("\n")
    .flatMap((v, i) => [
      <React.Fragment key={`${i}t`}>{v}</React.Fragment>,
      <br key={`${i}b`} />,
    ]);
  elems.pop();
  return elems;
}
export default ControlVenueAnnouncementsPage;
