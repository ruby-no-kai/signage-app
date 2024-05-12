import { useContext } from "react";
import { AuthContext, AwsClients } from "./AuthProvider";
import { useAuth } from "react-oidc-context";
import { PubsubContext, PubsubContextData } from "./PubsubProvider";

export type ApiContext = AwsClients & {
  pubsub: PubsubContextData;
};

export function useAws(needsAuthenticated: boolean): AwsClients | null {
  const ctx = useContext(AuthContext);
  if (!ctx) throw "useAws() used outside of AuthContext";
  const oidc = useAuth();
  if (ctx.state === "ready") {
    if (needsAuthenticated && !ctx.loggedIn) {
      window.sessionStorage.setItem("rk-signage-back-to", location.toString());
      console.log("needs login");
      oidc.signinRedirect();
    }
    return ctx;
  }
  return null;
}

export function usePubsub() {
  const ctx = useContext(PubsubContext);
  if (!ctx) throw "usePubsub() outside of ChatProvider";
  return ctx;
}

export function useApiContext(needsAuthenticated: boolean): ApiContext | null {
  const aws = useAws(needsAuthenticated);
  const pubsub = usePubsub();
  if (aws) {
    return { ...aws, pubsub };
  } else {
    return null;
  }
}
