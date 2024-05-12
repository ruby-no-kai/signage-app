import React from "react";
import { useApiContext } from "./ApiContext";
import Api from "./Api";
import { Box } from "@chakra-ui/react";

export const TestPage: React.FC = () => {
  const aws = useApiContext(true);
  const { data: id } = Api.useCallerIdentity(aws);

  aws?.credentials()?.then((v) => console.log("creds", v));

  return <Box>{JSON.stringify(id)}</Box>;
};
export default TestPage;
