import React, { useEffect, useMemo } from "react";

import { Api, TrackSlug, VenueAnnouncement } from "./Api";

import { Box, Flex, Skeleton } from "@chakra-ui/react";

import { QRCodeSVG } from "qrcode.react";
import { useApiContext } from "./ApiContext";
import { useTick } from "./TickProvider";
import { useKioskContext } from "./KioskProvider";

const ROTATE_INTERVAL = 12;

export const SubScreenAnnouncementsView: React.FC<{ track: TrackSlug }> = ({
  track,
}) => {
  const kioskProps = useKioskContext();
  const apictx = useApiContext(false);
  const tick = useTick();
  const { data: venueAnnouncements } = Api.useVenueAnnouncements(apictx);

  const pages = useMemo(() => {
    const retval: VenueAnnouncement[] = [];
    if (venueAnnouncements) {
      console.debug(
        "SubScreenAnnouncementsView/venueAnnouncements",
        venueAnnouncements
      );
      const filteredAnns = venueAnnouncements.filter(
        (v) =>
          v.applicable_kiosks === undefined ||
          v.applicable_kiosks === null ||
          v.applicable_kiosks.indexOf(kioskProps.kind) >= 0
      );
      retval.push(...filteredAnns);
      console.debug(
        "SubScreenAnnouncementsView/venueAnnouncements/filtered",
        filteredAnns
      );
    }
    console.log("SubScreenAnnouncementsView/pages", kioskProps, retval);

    return retval;
  }, [kioskProps, venueAnnouncements]);

  const now = tick.unix();
  const idx =
    pages && pages.length > 0
      ? Math.floor(now / ROTATE_INTERVAL) % pages.length
      : undefined;
  const page = idx !== undefined ? pages[idx] : undefined;

  useEffect(() => {
    console.log(
      "SubScreenAnnouncementsView/page",
      { idx, total: pages.length },
      page
    );
  }, [idx, page, pages.length]);

  if (pages.length == 0) return <></>;
  if (page === undefined) return <></>;

  return (
    <React.Suspense fallback={<Skeleton w="100%" h="100%" />}>
      <Flex w="100%" h="100%" direction="row" justify="space-between">
        <Box fontSize="3.6vw" w="100%" h="100%">
          {returnToBr(page.content)}
        </Box>
        {page.url ? (
          <>
            <Box
              css={{ "& svg": { height: "100%", width: "auto" } }}
              bgColor="white"
            >
              <QRCodeSVG
                value={page.url}
                level={"M"}
                includeMargin={true}
                size={300}
              />
            </Box>
          </>
        ) : null}
      </Flex>
    </React.Suspense>
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
