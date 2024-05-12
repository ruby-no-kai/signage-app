import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useApiContext } from "./ApiContext";
import Api, { ScreenViewKind, VenueAnnouncement } from "./Api";
import { ScreenHeroFiller } from "./ScreenHeroFiller";
import { ScreenVenueAnnouncementView } from "./ScreenVenueAnnouncementView";
import { useKioskContext } from "./KioskProvider";
import { useTick } from "./TickProvider";
import { ScreenSessionsView } from "./ScreenSessionsView";

const ROTATE_INTERVAL = 12;

type Page =
  | {
      kind: "venue_announcements";
      ann: VenueAnnouncement;
    }
  | {
      kind: "hero";
    }
  | {
      kind: "sessions";
    };

export const ScreenRotationView: React.FC = () => {
  const kioskProps = useKioskContext();
  const apictx = useApiContext(false);
  const tick = useTick();
  const { data: screen } = Api.useScreenControl(apictx, kioskProps.track);
  const { data: venueAnnouncements } = Api.useVenueAnnouncements(apictx);

  const pages = useMemo(() => {
    const includedViews: ScreenViewKind[] = screen?.rotated_views ?? ["hero"];

    const retval: Page[] = [];
    if (includedViews.indexOf("hero") >= 0) retval.push({ kind: "hero" });
    if (includedViews.indexOf("sessions") >= 0)
      retval.push({ kind: "sessions" });
    if (
      venueAnnouncements &&
      includedViews.indexOf("venue_announcements") >= 0
    ) {
      console.debug(
        "ScreenRotationView/venueAnnouncements",
        venueAnnouncements
      );
      const filteredAnns = venueAnnouncements.filter(
        (v) =>
          v.applicable_kiosks === undefined ||
          v.applicable_kiosks === null ||
          v.applicable_kiosks.indexOf(kioskProps.kind) >= 0
      );
      retval.push(
        ...filteredAnns.map(
          (ann) =>
            ({
              kind: "venue_announcements",
              ann,
            } as Page) // FIXME:
        )
      );
      console.debug(
        "ScreenRotationView/venueAnnouncements/filtered",
        filteredAnns
      );
    }
    console.log("ScreenRotationView/pages", kioskProps, includedViews, retval);

    return retval;
  }, [kioskProps, screen, venueAnnouncements]);

  const now = tick.unix();
  const idx =
    pages && pages.length > 0
      ? Math.floor(now / ROTATE_INTERVAL) % pages.length
      : undefined;
  const page = idx !== undefined ? pages[idx] : undefined;

  useEffect(() => {
    console.log("ScreenRotationView/page", { idx, total: pages.length }, page);
  }, [idx, page, pages.length]);

  if (pages.length == 0) return <ScreenHeroFiller />;
  if (page === undefined) return <ScreenHeroFiller />;

  // XXX: dupe with ScreenAnnounceView Inner
  //
  return (
    <>
      {page.kind === "hero" ? <ScreenHeroFiller /> : null}
      {page.kind === "venue_announcements" ? (
        <ScreenVenueAnnouncementView ann={page.ann} />
      ) : null}
      {page.kind === "sessions" ? <ScreenSessionsView /> : null}
    </>
  );
};
