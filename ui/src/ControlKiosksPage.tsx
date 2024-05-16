import React, { useState, useId } from "react";
import dayjs from "./dayjs";

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

import { Api, Kiosk, KioskKind } from "./Api";
import { Colors } from "./theme";
import { DeleteIcon } from "./DeleteIcon";
import { EditIcon } from "@chakra-ui/icons";
import { useApiContext } from "./ApiContext";

export const ControlKiosksPage: React.FC = () => {
  const apictx = useApiContext(true);
  const { data, error } = Api.useKiosks(apictx);

  if (!apictx || !data)
    return <p>{error ? <ErrorAlert error={error} /> : null}Loading..</p>;
  return (
    <Box mx="50px">
      {error ? <ErrorAlert error={error} /> : null}
      <Box>
        <Heading>Kiosks</Heading>
      </Box>
      <Box>
        {data.map((kiosk) => (
          <ControlKioskView key={kiosk.id} kiosk={kiosk} />
        ))}
      </Box>
    </Box>
  );
};

export const ControlKioskView: React.FC<{
  kiosk: Kiosk;
}> = ({ kiosk }) => {
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
          <ControlKioskForm
            target={kiosk}
            disclosureProps={editDisclosureProps}
          />
        </Box>
        <Box>
          <KioskRemoval kiosk={kiosk} />
        </Box>
      </Flex>

      <Text>{kiosk.name}</Text>
      <Text>
        <code>{kiosk.id}</code>
      </Text>
      <Text>Running: {kiosk.revision}</Text>
      <Text>Path: {kiosk.path}</Text>
      <Text>
        Heartbeat: {dayjs.unix(kiosk.last_heartbeat_at).format()}, Boot:{" "}
        {dayjs.unix(kiosk.last_boot_at).format()}
      </Text>
    </Box>
  );
};

const KioskRemoval: React.FC<{
  kiosk: Kiosk;
}> = ({ kiosk }) => {
  const aws = useApiContext(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const toast = useToast();
  const perform = () => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);
    Api.deleteKiosk(aws, kiosk)
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

// FIXME: prerendered form doesn't change its value after background mutation

const ControlKioskForm: React.FC<{
  target: Kiosk;
  disclosureProps?: UseDisclosureReturn;
}> = ({ target, disclosureProps }) => {
  const aws = useApiContext(true);
  const formID = useId();
  const toast = useToast();
  const defaultDisclosure = useDisclosure();
  const { isOpen, onOpen, onClose } = disclosureProps ?? defaultDisclosure;
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);

  const { register, handleSubmit, reset, watch, setValue } = useForm<
    Pick<Kiosk, "name">
  >({
    defaultValues: {
      name: target.name,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);

    try {
      const resp = await Api.updateKiosk(aws, { ...target, ...data });
      console.log("resp", resp);
      //onClose();
    } catch (e) {
      toast(errorToToast(e));
    }
    setIsRequesting(false);
  });

  const onReload = async () => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);

    try {
      const resp = await Api.reloadKiosk(aws, target);
      toast({
        title: "Reload Command sent",
        description: "",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (e) {
      toast(errorToToast(e));
    }
    setIsRequesting(false);
  };
  const onIdent = async () => {
    if (!aws) return;
    if (isRequesting) return;
    setIsRequesting(true);

    try {
      const resp = await Api.identKiosk(aws, target);
      toast({
        title: "Ident Command sent",
        description: "",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (e) {
      toast(errorToToast(e));
    }
    setIsRequesting(false);
  };

  return (
    <>
      <Modal
        size="3xl"
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Control Kiosk</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack as="form" w="100%" onSubmit={onSubmit} id={formID}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input type="text" {...register("name")} />
              </FormControl>

              <FormControl>
                <Button
                  colorScheme="blue"
                  mr={3}
                  form={formID}
                  type="submit"
                  isLoading={isRequesting}
                  isDisabled={!aws}
                >
                  Save
                </Button>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <FormControl>
              <Button
                colorScheme="red"
                mr={3}
                form={formID}
                isLoading={isRequesting}
                isDisabled={!aws}
                onClick={onReload}
              >
                Reload
              </Button>
              <Button
                colorScheme="green"
                mr={3}
                form={formID}
                isLoading={isRequesting}
                isDisabled={!aws}
                onClick={onIdent}
              >
                Ident
              </Button>
            </FormControl>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
