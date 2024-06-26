import React from "react";

import { Box } from "@chakra-ui/react";
import TrackCaption from "./TrackCaption";
import { TrackSlug } from "./Api";

export const SubScreenCaptionView: React.FC<{ track: TrackSlug }> = ({
  track,
}) => {
  return (
    <Box fontSize="3.6vw" w="100%" h="100%">
      <TrackCaption track={track} />
    </Box>
  );
};
