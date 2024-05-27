import dayjs from "dayjs/esm/index.js";
import relativeTime from "dayjs/esm/plugin/relativeTime/index.js";
import utc from "dayjs/esm/plugin/utc/index.js";
import timezone from "dayjs/esm/plugin/timezone/index.js";
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export type Dayjs = ReturnType<typeof dayjs>;

export { dayjs };
export default dayjs;
