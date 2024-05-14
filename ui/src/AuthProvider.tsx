import {
  fromCognitoIdentityPool,
  fromTemporaryCredentials,
  CognitoIdentityCredentialProvider,
  fromWebToken,
} from "@aws-sdk/credential-providers";
import { memoize } from "@smithy/property-provider";
import {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
  MemoizedProvider,
  Provider,
} from "@aws-sdk/types";
import { ReactNode, createContext, useEffect, useMemo } from "react";
import {
  AuthContextProps,
  AuthProvider as OIDCAuthProvider,
  useAuth,
} from "react-oidc-context";
import Api, { Config } from "./Api";
import { WebStorageStateStore } from "oidc-client-ts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { STSClient } from "@aws-sdk/client-sts";
import useSWR from "swr";
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetOpenIdTokenCommand,
} from "@aws-sdk/client-cognito-identity";

type CredentialVendedfromProvider<P> = P extends Provider<infer X> ? X : never;

type CognitoIdSource =
  | { anonymous: true; sub: "" }
  | { anonymous: false; sub: string; idToken: string }
  | undefined;

type ContextData =
  | { state: "waiting"; provider: null }
  | ({
      state: "ready";
      loggedIn: boolean;
    } & AwsClients);

export type AwsClients = {
  config: Config;
  identityId: string;
  credentials: MemoizedProvider<
    CredentialVendedfromProvider<AwsCredentialIdentityProvider>
  >;
  dynamodb: DynamoDBClient;
  sts: STSClient;
};

export const AuthContext = createContext<ContextData>({
  state: "waiting",
  provider: null,
});

function useValue(
  config: Config | undefined,
  auth: AuthContextProps
): ContextData {
  if (auth.error) console.error(auth.error);

  let authStatus: CognitoIdSource = undefined;
  if (config && !auth.isLoading && !auth.error) {
    if (auth.user && auth.user.id_token) {
      authStatus = {
        anonymous: false,
        sub: auth.user.profile.sub,
        idToken: auth.user.id_token,
      };
    } else {
      authStatus = { anonymous: true, sub: "" };
    }
  }
  const { data: cognitoId } = useCognitoId(config, authStatus);

  const provider = useMemo(() => {
    if (!(cognitoId && config)) return undefined;
    if (authStatus === undefined) return undefined;
    const roles: [string, string] = cognitoId.logins[config.user_pool_issuer]
      ? [
          config.iam_role_arn_authenticated_stage1,
          config.iam_role_arn_authenticated_stage2,
        ]
      : [
          config.iam_role_arn_unauthenticated_stage1,
          config.iam_role_arn_unauthenticated_stage2,
        ];
    return memoize(
      cognitoClassicProvider(config, cognitoId, ...roles),
      (token) =>
        token.expiration !== undefined &&
        token.expiration.getTime() - Date.now() < 300000,
      (token) => token.expiration !== undefined
    );
  }, [authStatus === undefined, config, cognitoId]);

  useEffect(() => {
    if (!provider) return;
    setTimeout(() => provider().then((v: unknown) => v), 0);
  }, [provider]);

  if (!provider) return { state: "waiting", provider: null };
  if (!config) return { state: "waiting", provider: null };
  if (!cognitoId) return { state: "waiting", provider: null };
  if (!authStatus) return { state: "waiting", provider: null };

  const clientConfig = {
    region: config.aws_region,
    credentials: provider,
  };

  return {
    state: "ready",
    config,
    loggedIn: !authStatus.anonymous,
    identityId: cognitoId.identityId,
    credentials: provider,
    dynamodb: new DynamoDBClient(clientConfig),
    sts: new STSClient(clientConfig),
  };
}

type CognitoIdValue = { identityId: string; logins: { [x: string]: string } };
function useCognitoId(config: Config | undefined, auth: CognitoIdSource) {
  return useSWR<CognitoIdValue>(
    [
      `/.virtual/AuthProvider-cognito-id`,
      config?.iot_topic_prefix,
      auth?.anonymous,
      auth?.sub,
    ],
    async ([, prefix, anonymous, sub]) => {
      if (config === undefined) throw "!config";
      const cacheKey = anonymous
        ? `rk-signage:${prefix}:anon:anon`
        : `rk-signage:${prefix}:u:${sub}`;
      const logins =
        config && auth && auth.anonymous === false
          ? { [config.user_pool_issuer]: auth.idToken }
          : {};
      const cachedItem = window.localStorage.getItem(cacheKey);
      if (cachedItem) {
        return { identityId: cachedItem, logins };
      }
      const client = new CognitoIdentityClient({ region: config.aws_region });

      const res = await client.send(
        new GetIdCommand({
          IdentityPoolId: config.identity_pool_id,
          Logins: logins,
        })
      );
      if (!res.IdentityId) {
        throw "empty cognito identity id";
      }
      window.localStorage.setItem(cacheKey, res.IdentityId);
      return { identityId: res.IdentityId, logins };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );
}

function cognitoClassicProvider(
  config: Config,
  cognitoId: CognitoIdValue,
  roleArn1: string,
  roleArn2: string
): AwsCredentialIdentityProvider {
  return async (): Promise<AwsCredentialIdentity> => {
    const cognito = new CognitoIdentityClient({ region: config.aws_region });
    const idToken = await cognito.send(
      new GetOpenIdTokenCommand({
        IdentityId: cognitoId.identityId,
        Logins: cognitoId.logins,
      })
    );
    const masterCredentials = fromWebToken({
      roleArn: roleArn1,
      webIdentityToken: idToken.Token!,
      roleSessionName: `${config.iot_topic_prefix}-browser`,
      durationSeconds: 3600,
      clientConfig: { region: config.aws_region },
    });
    return fromTemporaryCredentials({
      masterCredentials,
      clientConfig: { region: config.aws_region },
      params: {
        RoleArn: roleArn2,
        RoleSessionName: `${config.iot_topic_prefix}-browser`,
        DurationSeconds: 3600,
        Tags: [{ Key: "RkSignageUserSub", Value: cognitoId.identityId }],
      },
    })();
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
          authorization_endpoint: config.user_pool_authorize_url,
          //"https://rk-signage-dev.auth.ap-northeast-1.amazoncognito.com/oauth2/authorize",
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
  const val = useValue(config, auth);
  console.log("auth value", val);
  return <AuthContext.Provider value={val}>{children}</AuthContext.Provider>;
};
