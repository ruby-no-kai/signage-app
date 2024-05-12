import React, { useEffect, useState, useRef, useId } from "react";
import { useForm } from "react-hook-form";

import { Api } from "./Api";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Button,
  FormControl,
  FormLabel,
  Input,
  useToast,
} from "@chakra-ui/react";
import { errorToToast } from "./ErrorAlert";
import { useApiContext } from "./ApiContext";

export const KioskLogin: React.FC = () => {
  const apictx = useApiContext(false);
  const { data: currentKiosk } = Api.useCurrentKiosk(apictx);

  const [shouldVisible, setShouldVisible] = useState(false);

  useEffect(() => {
    if (currentKiosk === null) setShouldVisible(true);
    if (currentKiosk) console.log("currentKiosk", currentKiosk);
  }, [currentKiosk]);

  if (!shouldVisible) return <></>;

  return <KioskLoginInner />;
};

const KioskLoginInner: React.FC = () => {
  const apictx = useApiContext(false);
  const toast = useToast();
  const formID = useId();
  const initialRef = useRef(null);
  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: true });
  const [isRequesting, setIsRequesting] = useState(false);
  const { register, handleSubmit } = useForm<{
    name: string;
  }>({ defaultValues: { name: "" } });

  const onSubmit = handleSubmit(async (data) => {
    if (!apictx) return;
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      await Api.enrollKiosk(apictx, { name: data.name });
      onClose();
    } catch (e) {
      toast(errorToToast(e));
    }
    setIsRequesting(false);
  });

  return (
    <Modal initialFocusRef={initialRef} isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Kiosk Enrollment</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <p>Beep beep, beep boop?</p>
          <form onSubmit={onSubmit} id={formID}>
            <FormControl mt={4} id="login_name" isRequired>
              <FormLabel>Name this device</FormLabel>
              <Input
                {...register("name")}
                required={true}
                type="input"
                placeholder="e.g. Hall A Subscreen, Signage 101, ..."
              />
            </FormControl>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="teal"
            form={formID}
            isLoading={isRequesting}
            isDisabled={!apictx}
            type="submit"
          >
            Boop boop
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default KioskLogin;
