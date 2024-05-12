import {
  fromCognitoIdentityPool,
  fromTemporaryCredentials,
  CognitoIdentityCredentialProvider,
} from "@aws-sdk/credential-providers";
import { memoize } from "@smithy/property-provider";
import {
  AwsCredentialIdentity,
  MemoizedProvider,
  Provider,
} from "@aws-sdk/types";
import { ReactNode, createContext, useContext } from "react";
import {
  AuthContextProps,
  AuthProvider as OIDCAuthProvider,
  useAuth,
} from "react-oidc-context";
import Api, { Config } from "./Api";
import { WebStorageStateStore } from "oidc-client-ts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { STSClient } from "@aws-sdk/client-sts";

type CredentialVendedfromProvider<P> = P extends Provider<infer X> ? X : never;

type ContextData =
  | { state: "waiting"; provider: null }
  | ({
      state: "ready";
      provider: MemoizedProvider<
        CredentialVendedfromProvider<CognitoIdentityCredentialProvider>
      >;
      loggedIn: boolean;
    } & AwsClients);

export type AwsClients = {
  config: Config;
  credentials: MemoizedProvider<
    CredentialVendedfromProvider<CognitoIdentityCredentialProvider>
  >;
  mqttCredentials: MemoizedProvider<AwsCredentialIdentity>;
  dynamodb: DynamoDBClient;
  sts: STSClient;
};

export const AuthContext = createContext<ContextData>({
  state: "waiting",
  provider: null,
});

function getValue(
  config: Config | undefined,
  auth: AuthContextProps
): ContextData {
  if (!config) return { state: "waiting", provider: null };
  if (auth.isLoading) return { state: "waiting", provider: null };
  if (auth.error) {
    console.error(auth.error);
    return { state: "waiting", provider: null };
  }

  const loggedIn = !!(auth.isAuthenticated && auth.user);
  const logins =
    loggedIn && auth.user?.id_token
      ? { [config.user_pool_issuer]: auth.user.id_token }
      : {};

  const provider = memoize(
    fromCognitoIdentityPool({
      identityPoolId: config?.identity_pool_id,
      clientConfig: { region: config.aws_region },
      logins,
    })
  );

  // Using separate non-Cognito provided credentials to avoid Amazon Cognito special logics on AWS IoT (which requires resource-policy for every identityId)
  const mqttProvider = memoize(async () => {
    const masterCredentials = await provider();
    const id = (masterCredentials as unknown as { identityId: string })
      .identityId;

    return await fromTemporaryCredentials({
      masterCredentials: provider,
      clientConfig: { region: config.aws_region },
      params: {
        RoleArn: loggedIn
          ? config.iot_iam_role_arn_authenticated
          : config.iot_iam_role_arn_unauthenticated,
        RoleSessionName: `${config.iot_topic_prefix}-browser`,
        DurationSeconds: 3600,
        Tags: [{ Key: "RkSignageUserSub", Value: id }],
      },
    })();
  });

  setTimeout(() => mqttProvider().then((v) => v), 0);

  const clientConfig = {
    region: config.aws_region,
    credentials: provider,
  };

  return {
    state: "ready",
    provider,
    loggedIn,
    config,
    credentials: provider,
    mqttCredentials: mqttProvider,
    dynamodb: new DynamoDBClient(clientConfig),
    sts: new STSClient(clientConfig),
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  console.log("hi");
  const { data: config } = Api.useConfig();
  const oidcConfig = config
    ? {
        authority: `https://${config.user_pool_issuer}`,
        metadata: {
          issuer: `https://${config.user_pool_issuer}`,
          authorization_endpoint:
            "https://rk-signage-dev.auth.ap-northeast-1.amazoncognito.com/oauth2/authorize",
          token_endpoint: config.user_pool_token_url,
          //jwks_uri: `https://${config.user_pool_issuer}/.well-known/jwks.json`,
          response_types_supported: ["code", "token"],
          scopes_supported: ["openid", "email", "profile"],
        },
        client_id: config.user_pool_client_id,
        client_secret: config.user_pool_client_secret,
        redirect_uri: `${window.origin}/oauth2callback`,
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        onSigninCallback: () => {
          const l =
            window.sessionStorage.getItem("rk-signage-back-to") || "/control";
          location.href = l;
        },
      }
    : null;

  if (oidcConfig === null)
    return (
      <>
        <p>Loading Config</p>
      </>
    );

  return (
    <>
      <OIDCAuthProvider {...oidcConfig}>
        <AuthInner config={config}>{children}</AuthInner>
      </OIDCAuthProvider>
    </>
  );
};

const AuthInner: React.FC<{
  children: ReactNode;
  config: Config | undefined;
}> = ({ children, config }) => {
  const auth = useAuth();
  const val = getValue(config, auth);
  console.log("auth value", val);
  return <AuthContext.Provider value={val}>{children}</AuthContext.Provider>;
};
