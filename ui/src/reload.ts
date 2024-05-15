import { ReloadMessage } from "./Api";

export function doReload(payload?: ReloadMessage) {
  if (!navigator.onLine) {
    console.warn("cannot reload because offline", payload);
    return;
  }
  console.log("will reload after preflight check", payload);

  fetch("/config.json")
    .then((v) => v.text())
    .then((_j) => {
      console.log("reloading", payload);
      location.reload();
    })
    .catch((e) => {
      console.warn("reload preflight checkfailed", e);
    });
}
