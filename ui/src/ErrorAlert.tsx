import React from "react";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  UseToastOptions,
} from "@chakra-ui/react";

export type Props = {
  error: Error | unknown;
};

export const ErrorAlert: React.FC<Props> = ({ error }) => {
  let e =
    error instanceof Error
      ? error
      : (() => {
          console.error("ErrorAlert: got !(instanceof Error)", error);
          return new Error(`Unknown Error: ${error}`);
        })();
  console.error(e);
  return (
    <>
      <Alert status="error">
        <AlertIcon />
        <AlertTitle mr={2}>{e.name}</AlertTitle>
        <AlertDescription>{e.message}</AlertDescription>
      </Alert>
    </>
  );
};

export function errorToToast(error: Error | unknown): UseToastOptions {
  let e =
    error instanceof Error
      ? error
      : (() => {
          console.error("ErrorAlert: got !(instanceof Error)", error);
          return new Error(`Unknown Error: ${error}`);
        })();
  return {
    status: "error",
    title: `Error (${e.name})`,
    description: e.message,
    duration: 30000,
    isClosable: true,
    position: "top",
  };
}
