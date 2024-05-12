import React from "react";
import { useApiContext } from "./ApiContext";
import Api from "./Api";
import { Box } from "@chakra-ui/react";
import { useAuth } from "react-oidc-context";

export const OAuthCallbackPage: React.FC = () => {
  const auth = useAuth();

  return <Box>logged in...</Box>;
};
export default OAuthCallbackPage;
