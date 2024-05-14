//.eslintrc.cjs:  extends: [
//README.md:- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
//src/ScreenAnnounceTime.tsx:dayjs.extend(relativeTime);
//src/ScreenAnnounceTime.tsx:dayjs.extend(utc);
//src/ScreenAnnounceTime.tsx:dayjs.extend(timezone);
//src/ScreenSessionsView.tsx:dayjs.extend(relativeTime);
//src/ScreenSessionsView.tsx:dayjs.extend(utc);
//src/ScreenSessionsView.tsx:dayjs.extend(timezone);
//src/TickProvider.tsx:dayjs.extend(relativeTime);
//src/TickProvider.tsx:dayjs.extend(utc);
//src/TickProvider.tsx:dayjs.extend(timezone);
//src/theme.ts:import { extendTheme } from "@chakra-ui/react";
//src/theme.ts:export const theme = extendTheme({
//src/weakcallback.ts:export type AnyCallback<T extends unknown[]> = (...args: T) => unknown;
//src/weakcallback.ts:function makeCallback<T extends unknown[]>(wr: WeakRef<AnyCallback<T>>) {
//src/weakcallback.ts:export function makeWeakCallback<T extends unknown[]>(
//(END)
//

import dayjs from "dayjs/esm/index.js";
import relativeTime from "dayjs/esm/plugin/relativeTime/index.js";
import utc from "dayjs/esm/plugin/utc/index.js";
import timezone from "dayjs/esm/plugin/timezone/index.js";
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };
export default dayjs;
