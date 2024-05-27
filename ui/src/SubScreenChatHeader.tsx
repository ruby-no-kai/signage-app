import { Box } from "@chakra-ui/react";
import { useKioskContext } from "./KioskProvider";

export const SubScreenChatHeader: React.FC = () => {
  const kioskProps = useKioskContext();
  return (
    <Box h="100%" w="100%" fontSize="3.5vw" lineHeight="4vw" p="1vw">
      Chat: https://rubykaigi.org/go/discord → #rubykaigi-{kioskProps.track}
    </Box>
  );
};
