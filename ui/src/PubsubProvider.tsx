import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import useSWR from "swr";

import { auth, iot, mqtt5 } from "aws-iot-device-sdk-v2/lib/browser";
import type mqtt5_packet from "aws-crt/dist.browser/common/mqtt5_packet";
import { ulid } from "ulid";
import { AwsCredentialIdentity, Provider } from "@aws-sdk/types";

import { AuthContext, AwsClients } from "./AuthProvider";
import { toUtf8 } from "@smithy/util-utf8";
import { makeWeakCallback } from "./weakcallback";

export type PubsubContextDataReady = {
  state: "ready";
  id: string; // clientId
  client: mqtt5.Mqtt5Client;
  subscriberBag: SubscriberBag;
};
export type PubsubContextData = { state: "waiting" } | PubsubContextDataReady;

export const PubsubContext = createContext<PubsubContextData>({
  state: "waiting",
});

// dupe with apicontext
function useAwsLocal(): AwsClients | null {
  const ctx = useContext(AuthContext);
  if (!ctx) throw "useAwsLocal() used outside of AuthContext";
  if (ctx.state === "ready") {
    return ctx;
  }
  return null;
}

export const PubsubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const aws = useAwsLocal();
  const [val, set] = useState<PubsubContextData>({ state: "waiting" });

  //return <>{children}</>;
  return (
    <>
      {aws ? <PubsubEngine set={set} aws={aws} /> : null}
      <PubsubContext.Provider value={val}>
        {aws ? (
          <PubsubSubscription
            packet={{
              subscriptions: [
                {
                  qos: mqtt5.QoS.AtLeastOnce,
                  topicFilter: `${aws.config.iot_topic_prefix}/uplink/all/heartbeat`,
                },
                {
                  qos: mqtt5.QoS.AtLeastOnce,
                  topicFilter: `${aws.config.iot_topic_prefix}/uplink/all/updates`,
                },
              ],
            }}
          />
        ) : null}
        {children}
      </PubsubContext.Provider>
    </>
  );
};

const PubsubEngine: React.FC<{
  set: (v: PubsubContextData) => void;
  aws: AwsClients;
}> = ({ set, aws }) => {
  const { data: clientId } = useClientId(aws);
  const [subscriberBag] = useState<SubscriberBag>(new SubscriberBag());
  const [credentialsProvider, setCredentialsProvider] =
    useState<null | PubsubCredProvider>(null);
  React.useEffect(() => {
    const provider = new PubsubCredProvider(
      aws.config.aws_region,
      aws.mqttCredentials
    );
    provider.refreshCredentials().then(() => setCredentialsProvider(provider));
  }, [aws]);
  React.useEffect(() => {
    if (!clientId) return;
    if (!credentialsProvider) return;
    const client = createMqttClient(
      aws,
      credentialsProvider,
      clientId,
      subscriberBag,
      set
    );
    client.start();
    return () => client.stop();
  }, [subscriberBag, credentialsProvider, clientId, aws, set]);
  return <></>;
};

export const PubsubSubscription: React.FC<{
  packet: mqtt5_packet.SubscribePacket;
}> = ({ packet }) => {
  const pubsub = usePubsubLocal();
  React.useEffect(() => {
    if (pubsub.state !== "ready") return;
    console.log("mqtt5 subscribing", packet);
    pubsub.client
      .subscribe(packet)
      .then((v: mqtt5_packet.SubackPacket) =>
        console.log("mqtt5 subscription", v)
      );
    // TODO; unsubscribe
  }, [pubsub, JSON.stringify(packet)]);
  return <></>;
};

export type PubsubMessage = {
  topic: string;
  payload: PubsubMessagePayload;
};
export type PubsubMessageHeader = {
  kind: string;
  from: string;
  nonce?: string;
};
export type PubsubMessagePayload = PubsubMessageHeader &
  Record<string, unknown>;

function tryMessageFromEvent(
  event: mqtt5.MessageReceivedEvent
): null | PubsubMessage {
  try {
    const payload = event.message.payload
      ? JSON.parse(toUtf8(event.message.payload as Buffer))
      : null;
    if (!payload) return null;
    return {
      topic: event.message.topicName,
      payload,
    };
  } catch (e) {
    console.warn("tryMessageFromEvent error", e);
    return null;
  }
}

type MessageSubscriber = {
  id: number;
  active: boolean;
  test?: RegExp;
  topic?: string;
  fn: (message: PubsubMessage, event: mqtt5.MessageReceivedEvent) => boolean; // weakCallback
};
class SubscriberBag {
  list: MessageSubscriber[];
  nextId: number;
  constructor() {
    this.list = [];
    this.nextId = 0;
  }
  subscribe(options: {
    test?: RegExp;
    topic?: string;
    onMessage: (
      message: PubsubMessage,
      event: mqtt5.MessageReceivedEvent
    ) => void;
  }) {
    const fn = makeWeakCallback(options.onMessage);
    this.nextId += 1;
    const subscription = {
      id: this.nextId,
      active: true,
      test: options.test,
      topic: options.topic,
      fn,
    };
    this.list.push(subscription);
    console.log("SubscriberBag activated", subscription);
    return () => {
      subscription.active = false;
      console.log("SubscriberBag deactivated", subscription);
    };
  }
  deliverToMessageHandler(event: mqtt5.MessageReceivedEvent) {
    const message = tryMessageFromEvent(event);
    console.log("mqtt5/SubscriberBag/Message", message.topic, message.payload);
    if (!message) {
      console.warn("mqtt5/SubscriberBag/Message/Invalid", event);
      return;
    }
    const newList = this.list.filter((sub) => {
      if (!sub.active) return false;
      if (sub.test && !sub.test.test(event.message.topicName)) return true;
      if (sub.topic !== undefined && sub.topic !== event.message.topicName)
        return true;
      return sub.fn(message, event); // weakCallback return false for dead functions
    });
    this.list = newList;
  }
}

export const PubsubMessageHandler: React.FC<{
  test?: RegExp;
  topic?: string;
  onMessage: (
    message: PubsubMessage,
    event: mqtt5.MessageReceivedEvent
  ) => void;
}> = ({ test, topic, onMessage }) => {
  const ctx = usePubsubLocal();
  useEffect(() => {
    if (ctx.state !== "ready") return;
    return ctx.subscriberBag.subscribe({ test, topic, onMessage });
  }, [ctx, test, topic, onMessage]);
  return <></>;
};

function useClientId(aws: AwsClients) {
  return useSWR<string>(
    `/.virtual/PubsubProvider-useClientId`,
    async () => {
      //const creds = await aws.credentials();
      //const id = (creds as unknown as { identityId: string }).identityId;
      return `${aws.config.iot_topic_prefix}-u-${ulid()}`;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );
}

function credentialRefresherTask(target: WeakRef<PubsubCredProvider>) {
  const provider = target?.deref();
  if (provider) {
    provider
      .refreshCredentials()
      .then(() => console.log("PubsubCredProvider auto refresh done"));
    setTimeout(credentialRefresherTask.bind(null, target), 1800 * 1000);
    return;
  }
}

class PubsubCredProvider extends auth.CredentialsProvider {
  sdkProvider: Provider<AwsCredentialIdentity>;
  region: string;
  cache: undefined | auth.AWSCredentials;
  constructor(region: string, sdkProvider: Provider<AwsCredentialIdentity>) {
    super();
    this.sdkProvider = sdkProvider;
    this.region = region;
    this.cache = undefined;
    setTimeout(credentialRefresherTask.bind(null, new WeakRef(this)), 0);
  }
  async refreshCredentials(): Promise<void> {
    const creds = await this.sdkProvider();
    this.cache = {
      aws_access_id: creds.accessKeyId,
      aws_secret_key: creds.secretAccessKey,
      aws_sts_token: creds.sessionToken,
      aws_region: this.region,
    };
  }
  getCredentials(): auth.AWSCredentials {
    const retval = this.cache ?? {
      aws_access_id: "",
      aws_secret_key: "",
      aws_region: this.region,
    };
    //console.log("PubsubCredProvider returns", retval);
    return retval;
  }
}

function createMqttClient(
  aws: AwsClients,
  credentialsProvider: PubsubCredProvider,
  clientId: string,
  subscriberBag: SubscriberBag,
  set: (v: PubsubContextData) => void
): mqtt5.Mqtt5Client {
  const builder =
    iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
      aws.config.iot_endpoint,
      {
        credentialsProvider,
        //region: aws.config.aws_region,
      }
    ).withConnectProperties({
      clientId,
      keepAliveIntervalSeconds: 20,
    });
  console.log("mqtt5 client build", builder);
  const client = new mqtt5.Mqtt5Client(builder.build());

  client.on("error", (error) => {
    console.error("mqtt5 error", error);
  });

  client.on("messageReceived", (event: mqtt5.MessageReceivedEvent): void => {
    console.debug("mqtt5 message event", event);
    if (event.message.payload) {
      console.debug(
        "mqtt5 message payload",
        toUtf8(event.message.payload as Buffer)
      );
    }
  });
  client.on(
    "messageReceived",
    subscriberBag.deliverToMessageHandler.bind(subscriberBag)
  );

  client.on("attemptingConnect", (event) => {
    console.log("mqtt5 attemptingConnect", event);
  });

  client.on("connectionSuccess", (event: mqtt5.ConnectionSuccessEvent) => {
    console.log("mqtt5 connectionSuccess", event);
    set({ state: "ready", client: client, id: clientId, subscriberBag });
  });

  client.on("connectionFailure", (event: mqtt5.ConnectionFailureEvent) => {
    console.warn("mqtt5 connectionFailure", event);
  });

  client.on("disconnection", (event: mqtt5.DisconnectionEvent) => {
    console.warn("mqtt5 disconnected", event);
  });

  client.on("stopped", (event: mqtt5.StoppedEvent) => {
    console.warn("mqtt5 stopped", event);
  });

  return client;
}

function usePubsubLocal() {
  const ctx = useContext(PubsubContext);
  if (!ctx) throw "usePubsub() outside of ChatProvider";
  return ctx;
}
