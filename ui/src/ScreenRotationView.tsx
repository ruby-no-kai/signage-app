import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useApiContext } from "./ApiContext";
import Api from "./Api";
import { ScreenHeroFiller } from "./ScreenHeroFiller";
import { ScreenVenueAnnouncementView } from "./ScreenVenueAnnouncementView";
import { useKioskContext } from "./KioskProvider";

const TICK_INTERVAL = 1;
const ROTATE_INTERVAL = 12;
export const ScreenRotationView: React.FC = () => {
  const kioskProps = useKioskContext();
  const apictx = useApiContext(false);
  const [tick, setTick] = useState(dayjs().unix());
  const { data: venueAnnouncements } = Api.useVenueAnnouncements(apictx);

  useEffect(() => {
    setTick(dayjs().unix());
    const timer = setInterval(() => {
      setTick(dayjs().unix());
    }, TICK_INTERVAL * 1000);
    return () => clearInterval(timer);
  }, []);

  const entries = useMemo(() => {
    if (venueAnnouncements === undefined) return undefined;
    console.log("ScreenRotationView/venueAnnouncements", venueAnnouncements);
    const retval = venueAnnouncements.filter(
      (v) =>
        v.applicable_kiosks === undefined ||
        v.applicable_kiosks === null ||
        v.applicable_kiosks.indexOf(kioskProps.kind) >= 0
    );
    console.log("ScreenRotationView/venueAnnouncements/filtered", retval);
    return retval;
  }, [kioskProps, venueAnnouncements]);

  if (entries === undefined) return <></>;
  if (entries.length == 0) return <ScreenHeroFiller />;

  const now = tick === -1 ? dayjs().unix() : tick;
  const idx = Math.floor(now / ROTATE_INTERVAL) % (entries.length + 1);
  const ann = idx == 0 ? null : entries[idx - 1];

  console.debug("ann", ann);
  // XXX: dupe with ScreenAnnounceView Inner
  // TODO: include ScreenMessageView
  // TODO: include ScreenHeroFiller
  return (
    <>
      {ann ? <ScreenVenueAnnouncementView ann={ann} /> : <ScreenHeroFiller />}
    </>
  );
};
