import useSWR from "swr";
import { mutate } from "swr";
import dayjs from "./dayjs";

import type { ApiContext } from "./ApiContext";
import { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  AttributeValue,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  paginateQuery,
} from "@aws-sdk/client-dynamodb";
import { ulid } from "ulid";
import { mqtt5 } from "aws-crt/dist.browser/browser";
import { PubsubMessageHeader, PubsubMessagePayload } from "./PubsubProvider";

export type ApiPubsubMessage =
  | BroadcastMutateMessage
  | CaptionMessage
  | HeartbeatDownlinkMessage
  | HeartbeatUplinkMessage
  | ReloadMessage
  | IdentMessage
  | ChatMessage;

export function guardApiPubsubMessage(
  message: PubsubMessagePayload
): ApiPubsubMessage | undefined {
  if (!message.kind) {
    console.warn("guardApiPubsubMessage", message);
    return undefined;
  }
  return message as ApiPubsubMessage; // XXX:
}

export type HeartbeatUplinkMessage = PubsubMessageHeader & {
  kind: "HeartbeatUplink";
  from: string;
  nonce: string;
  in_reply_to: string;
  ts: number;
};
export type HeartbeatDownlinkMessage = PubsubMessageHeader & {
  kind: "HeartbeatDownlink";
  from: string;
  nonce: string;
  ts: number;
  revision: string;
  booted_at: number;
  path: string;
};

export type TrackSlug = string;

const ALL_TRACKS: TrackSlug[] = ["a", "b", "c", "_hallway"];
const TRACKS: TrackSlug[] = ["a", "b", "c"];

export type Config = {
  aws_region: string;
  tenant: string;

  all_tracks: TrackSlug[];
  tracks: TrackSlug[];

  dynamodb_table_name: string;

  iot_endpoint: string;
  iot_topic_prefix: string;

  user_pool_issuer: string;
  user_pool_client_id: string;
  user_pool_client_secret: string;
  user_pool_authorize_url: string;
  user_pool_token_url: string;

  identity_pool_id: string;

  iam_role_arn_unauthenticated_stage1: string;
  iam_role_arn_unauthenticated_stage2: string;
  iam_role_arn_authenticated_stage1: string;
  iam_role_arn_authenticated_stage2: string;
};

export type ScreenMode = "rotation" | "filler" | "message";
const SCREEN_MODES_MAP: Map<string, true> = new Map(
  ["rotation", "filler", "message"].map((k) => [k, true])
);
function isScreenMode(from: string): from is ScreenMode {
  return SCREEN_MODES_MAP.has(from);
}
export function guardScreenMode(from: string): ScreenMode {
  return isScreenMode(from) ? from : "filler";
}

export type ScreenViewKind =
  | "hero"
  | "venue_announcements"
  | "sessions"
  | "unknown";
const SCREEN_VIEW_KINDS: Map<string, true> = new Map(
  ["hero", "venue_announcements", "sessions"].map((k) => [k, true])
);
function isScreenViewKind(from: string): from is ScreenViewKind {
  return SCREEN_VIEW_KINDS.has(from);
}
export function guardScreenViewKind(from: string): ScreenViewKind {
  return isScreenViewKind(from) ? from : "unknown";
}

export type ScreenControlFull = {
  track: TrackSlug;
  mode: ScreenMode;

  rotated_views: ScreenViewKind[];

  show_sponsors: boolean;
  intermission: boolean;
  lightning_timer?: LightningTimer;

  message?: ScreenControlMessage;

  updated_at: number;
};
export type ScreenControl = ScreenControlFull;
//| (ScreenControlFull & { mode: "message"; message: ScreenControlMessage });

export type ScreenControlMessage = {
  heading?: string;
  footer?: string;
  // TODO: next_schedule?:
};
export type LightningTimer = {
  enabled: boolean;
  tick: number | null;
  starts_at: number;
  ends_at: number;
  expires_at: number;
};

function dynamodbScreenControl(
  possibleItem: Record<string, AttributeValue> | undefined,
  track?: TrackSlug
): ScreenControlFull {
  const retval = {
    track: (possibleItem?.track?.S ?? track ?? "?") as TrackSlug,
    mode: guardScreenMode(possibleItem?.mode?.S ?? ""),

    rotated_views: possibleItem?.rotated_views?.L?.flatMap(
      (i: AttributeValue): ScreenViewKind[] =>
        i.S ? [guardScreenViewKind(i.S)] : []
    ) ?? ["hero", "venue_announcements", "sessions"],

    show_sponsors: possibleItem?.show_sponsors?.BOOL ?? true,
    intermission: possibleItem?.intermission?.BOOL ?? false,

    message: ((map) =>
      map && {
        heading: map?.heading?.S ?? undefined,
        footer: map?.footer?.S ?? undefined,
      })(possibleItem?.message?.M ?? undefined),
    lightning_timer: ((map) =>
      map
        ? {
            enabled: map?.enabled?.BOOL ?? true,
            tick: ((x) => (x ? x : null))(Number(map?.tick?.N ?? 0)),
            starts_at: Number(map?.starts_at?.N ?? 0),
            ends_at: Number(map?.ends_at?.N ?? 0),
            expires_at: Number(map?.expires_at?.N ?? 0),
          }
        : undefined)(possibleItem?.lightning_timer?.M),
    updated_at: Number(possibleItem?.updated_at?.N ?? 0),
  };
  return retval;
}

// export type ScreenNextSchedule = {
//   at: number;
//   title: string;
//   absolute_only?: boolean;
// };

export type ConferenceSession = {
  slug: string;
  track: TrackSlug;
  hall: string;
  starts_at: number;
  ends_at: number;
  title: string;
  speakers: Speaker[] | null;
  updated_at: number;
};
export type Speaker = {
  name: string;
  slug: string;
  github_id: string | null;
  twitter_id: string | null;
  avatar_url: string;
};

export type ConferenceSessionsBag = {
  tracks: Map<TrackSlug, ConferenceSession[]>;
};

function dynamodbConferenceSession(
  possibleItem: Record<string, AttributeValue>
): ConferenceSession {
  return {
    slug: possibleItem.slug?.S ?? "",
    track: possibleItem.track?.S ?? "",
    hall: possibleItem.hall?.S ?? "",
    starts_at: Number(possibleItem.starts_at?.N ?? 0),
    ends_at: Number(possibleItem.ends_at?.N ?? 0),
    title: possibleItem.title?.S ?? "",
    speakers:
      possibleItem?.speakers?.L?.flatMap((i: AttributeValue) =>
        i.M
          ? [
              {
                name: i.M.name?.S ?? "?",
                slug: i.M.slug?.S ?? "?",
                avatar_url: i.M.avatar_url?.S ?? "",
                github_id: i.M.github_id?.S ?? null,
                twitter_id: i.M.twitter_id?.S ?? null,
              },
            ]
          : []
      ) ?? [],
    updated_at: Number(possibleItem?.updated_at?.N ?? 0),
  };
}

export type ChatMessage = {
  kind: "Chat";
  track: TrackSlug;
  id: string;
  timestamp: number; // millis
  sender: ChatSender;
  content: string;
  redacted: boolean;
};

export type ChatSenderFlags = {
  //isAdmin?: boolean;
  //isAnonymous?: boolean;
  isStaff?: boolean;
  isSpeaker?: boolean;
  isCommitter?: boolean;
};

export interface ChatSender {
  id: string;
  name: string;
  avatar_url: string;
  flags: ChatSenderFlags;
}

export type ConferenceSponsorshipPlan = "ruby" | "platinum" | "gold" | "silver";
export type ConferenceSponsorship = {
  id: string;
  name: string;
  plan: ConferenceSponsorshipPlan;
  avatar_url: string;
  order_index: number;
  updated_at: number;
};

function dynamodbConferenceSponsorship(
  possibleItem: Record<string, AttributeValue>
): ConferenceSponsorship {
  return {
    id: possibleItem.id?.S ?? "",
    name: possibleItem.name?.S ?? "",
    plan: (possibleItem.plan?.S ?? "") as ConferenceSponsorshipPlan,
    avatar_url: possibleItem.avatar_url?.S ?? "",
    order_index: Number(possibleItem.order_index?.N ?? 0),
    updated_at: Number(possibleItem.updated_at?.N ?? 0),
  };
}

export type KioskKind = "subscreen" | "hallway" | "track" | "chat" | "unknown";
const KIOSK_KINDS_MAP: Map<string, true> = new Map(
  ["subscreen", "hallway", "track", "chat"].map((k) => [k, true])
);
function isKioskKind(from: string): from is KioskKind {
  return KIOSK_KINDS_MAP.has(from);
}
export function guardKioskKind(from: string): KioskKind {
  return isKioskKind(from) ? from : "unknown";
}

export type VenueAnnouncement = {
  id: string;
  tenant: string;
  enabled: boolean;
  order_index: number;
  content: string;
  url?: string;
  applicable_kiosks?: KioskKind[];
  updated_at: number;
};
export type VenueAnnouncementInput = Omit<
  VenueAnnouncement,
  "id" | "updated_at" | "tenant"
>;

function dynamodbVenueAnnouncement(
  possibleItem: Record<string, AttributeValue>
): VenueAnnouncement {
  return {
    id: possibleItem.id?.S ?? "",
    tenant: possibleItem.tenant?.S ?? "?",
    enabled: possibleItem.enabled?.BOOL ?? true,
    order_index: Number(possibleItem.order_index?.N ?? 0),
    content: possibleItem.content?.S ?? "",
    url: possibleItem.url?.S ?? undefined,
    applicable_kiosks:
      possibleItem.applicable_kiosks?.L?.flatMap(
        (i: AttributeValue): KioskKind[] => (i.S ? [guardKioskKind(i.S)] : [])
      ) ?? undefined,
    updated_at: Number(possibleItem.updated_at?.N ?? 0),
  };
}

async function dynamodbUpdateVenueAnnouncement(
  aws: ApiContext,
  create: boolean,
  input: VenueAnnouncement
) {
  const now = new Date();

  const tenant = create ? aws.config.tenant : input.tenant;
  const id = create ? ulid(now.getTime()) : input.id;

  const pk = `${tenant}::venue_announcements`;
  const sk = `${pk}:${id}`;

  const resp = await aws.dynamodb.send(
    new UpdateItemCommand({
      TableName: aws.config.dynamodb_table_name,
      Key: { pk: { S: pk }, sk: { S: sk } },
      ReturnValues: "ALL_NEW",
      ConditionExpression: create
        ? "attribute_not_exists(#sk)"
        : "attribute_exists(#pk) and attribute_exists(#sk)",
      UpdateExpression: `set ${
        create ? "#tenant = :tenant, #id = :id," : ""
      } #order_index = :order_index, #enabled = :enabled, #content = :content, #url = :url, #applicable_kiosks = :applicable_kiosks, #updated_at = :updated_at`,
      ExpressionAttributeNames: {
        "#order_index": "order_index",
        "#enabled": "enabled",
        "#content": "content",
        "#url": "url",
        "#applicable_kiosks": "applicable_kiosks",
        "#updated_at": "updated_at",
        "#sk": "sk",
        ...(create ? { "#tenant": "tenant", "#id": "id" } : { "#pk": "pk" }),
      },
      ExpressionAttributeValues: {
        ":enabled": { BOOL: input.enabled },
        ":order_index": { N: input.order_index.toString() },
        ":content": { S: input.content },
        ":url": input.url ? { S: input.url } : { NULL: true },
        ":applicable_kiosks":
          input.applicable_kiosks == undefined
            ? { NULL: true }
            : {
                L: input.applicable_kiosks.map((v) => ({
                  S: v,
                })),
              },
        ":updated_at": { N: dayjs(now).unix().toString() },
        ...(create
          ? {
              ":tenant": { S: aws.config.tenant },
              ":id": { S: id },
            }
          : {}),
      },
    })
  );
  console.log("dynamodbUpdateVenueAnnouncement", resp);
  return resp;
}

export type Kiosk = {
  id: string;
  tenant: string;
  name: string;
  revision: string;
  last_boot_at: number;
  last_heartbeat_at: number;
  path: string;
  updated_at: number;
  pk?: string;
  invalid?: string[];
};

function dynamodbKiosk(possibleItem: Record<string, AttributeValue>): Kiosk {
  const invalid = [];

  const pk = possibleItem.pk?.S ?? "";
  let tenant = possibleItem.tenant?.S ?? "";
  let id = possibleItem.id?.S ?? "";

  const pkMatch = pk.match(/^(.+)::kiosks:(.+)$/);
  const skMatch = possibleItem?.sk?.S === `${tenant}::kiosks`;

  if (pkMatch) {
    if (tenant !== pkMatch[1]) invalid.push("unmatched tenant");
    if (id !== pkMatch[2]) invalid.push("unmatched id");
    tenant = pkMatch[1];
    id = pkMatch[2];
  } else {
    invalid.push("invalid pk pattern");
  }
  if (!skMatch) invalid.push("sk mismatch");

  return {
    id,
    tenant,
    name: possibleItem.name?.S ?? possibleItem[":name"]?.S ?? "unknown",
    revision: possibleItem.revision?.S ?? "unknown",
    last_boot_at: Number(possibleItem?.last_boot_at?.N ?? 0),
    last_heartbeat_at: Number(possibleItem?.last_heartbeat_at?.N ?? 0),
    updated_at: Number(possibleItem?.updated_at?.N ?? 0),
    path: possibleItem.path?.S ?? "unknown",
    pk,
    invalid,
  };
}

export type CaptionMessage = PubsubMessageHeader & {
  kind: "Caption";
  track: TrackSlug;
  pid: number;
  sequence_id: number;
  round: number;
  result_id: string;
  is_partial: boolean;
  transcript: string;
};

export type BroadcastMutateMessage = PubsubMessageHeader & {
  kind: "BroadcastMutate";
  urls: string[];
};

async function broadcastMutate(ctx: ApiContext, urls: string[]) {
  if (ctx.pubsub.state !== "ready") return;
  const payload: BroadcastMutateMessage = {
    kind: "BroadcastMutate",
    from: ctx.pubsub.id.identity,
    nonce: ulid(),
    urls,
  };
  await ctx.pubsub.client.publish({
    qos: mqtt5.QoS.AtLeastOnce,
    topicName: `${ctx.config.iot_topic_prefix}/uplink/all/updates`,
    payload: JSON.stringify(payload),
  });
}

export type ReloadMessage = PubsubMessageHeader & {
  kind: "Reload";
  ts: number;
  from: string;
  nonce: string;
};

export type IdentMessage = PubsubMessageHeader & {
  kind: "Ident";
  nonce: string;
  ts: number;
};

export const Api = {
  useConfig() {
    return useSWR<Config>(
      "/config.json",
      async (url: string) => {
        const resp = await fetch(url);
        const j = await resp.json();
        if (resp.status === 200) {
          return {
            tracks: TRACKS,
            all_tracks: ALL_TRACKS,
            ...j,
          };
        } else {
          throw "failed to fetch config";
        }
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
      }
    );
  },

  useCallerIdentity(aws: ApiContext | null) {
    return useSWR(aws ? `/.virtual/caller-identity` : null, async () => {
      if (!aws) return null;
      return await aws.sts.send(new GetCallerIdentityCommand({}));
    });
  },

  //// sessions

  useConferenceSessions(aws: ApiContext | null) {
    return useSWR<ConferenceSessionsBag>(
      aws ? `/.virtual/sessions` : null,
      async () => {
        if (!aws) throw "aws is null";
        const key = `${aws.config.tenant}::sessions`;
        const paginator = paginateQuery(
          { client: aws.dynamodb },
          {
            TableName: aws.config.dynamodb_table_name,
            ExpressionAttributeValues: {
              ":pk": { S: key },
            },
            KeyConditionExpression: "pk = :pk",
          }
        );
        const possibleItems: Record<string, AttributeValue>[] = [];
        for await (const page of paginator) {
          possibleItems.push(...(page.Items ?? []));
        }
        const allSessions = possibleItems.map((i) =>
          dynamodbConferenceSession(i)
        );
        const map = new Map();
        allSessions.forEach((s) => {
          const list = map.get(s.track) || [];
          list.push(s);
          map.set(s.track, list);
        });
        return { tracks: map };
      }
    );
  },

  //// sponsorships

  useConferenceSponsorships(aws: ApiContext | null) {
    return useSWR<ConferenceSponsorship[]>(
      aws ? `/.virtual/sponsorships` : null,
      async () => {
        if (!aws) throw "aws is null";
        const key = `${aws.config.tenant}::sponsors`;
        const paginator = paginateQuery(
          { client: aws.dynamodb },
          {
            TableName: aws.config.dynamodb_table_name,
            ExpressionAttributeValues: {
              ":pk": { S: key },
            },
            KeyConditionExpression: "pk = :pk",
          }
        );
        const possibleItems: Record<string, AttributeValue>[] = [];
        for await (const page of paginator) {
          possibleItems.push(...(page.Items ?? []));
        }
        return possibleItems
          .map((i) => dynamodbConferenceSponsorship(i))
          .sort((a, b) => a.order_index - b.order_index);
      }
    );
  },

  //// screen_control

  useScreenControl(aws: ApiContext | null, track: TrackSlug) {
    return useSWR<ScreenControlFull>(
      aws ? `/.virtual/screen_controls/${track}` : null,
      async () => {
        if (ALL_TRACKS.indexOf(track) < 0)
          console.warn("useScreenControl unknown track given", { track });
        console.log("useScreenControl mutation", { track });
        if (!aws) throw "aws is null";
        const pk = `${aws.config.tenant}::screen_controls`;
        const sk = `${aws.config.tenant}::screen_controls:${track}`;
        const resp = await aws.dynamodb.send(
          new QueryCommand({
            TableName: aws.config.dynamodb_table_name,
            ExpressionAttributeValues: {
              ":pk": { S: pk },
              ":sk": { S: sk },
            },
            KeyConditionExpression: "pk = :pk AND sk = :sk",
          })
        );
        const possibleItem = resp.Items && resp.Items[0];
        return dynamodbScreenControl(possibleItem, track);
      }
    );
  },

  useScreenControls(aws: ApiContext | null) {
    return useSWR<Map<TrackSlug, ScreenControl>>(
      aws ? `/.virtual/screen_controls` : null,
      async () => {
        console.log("useScreenControls mutation");
        if (!aws) throw "aws is null";
        const key = `${aws.config.tenant}::screen_controls`;
        const paginator = paginateQuery(
          { client: aws.dynamodb },
          {
            TableName: aws.config.dynamodb_table_name,
            ExpressionAttributeValues: {
              ":pk": { S: key },
            },
            KeyConditionExpression: "pk = :pk",
          }
        );
        const retval = new Map();
        for await (const page of paginator) {
          if (page.Items) {
            page.Items.forEach((i) => {
              const item = dynamodbScreenControl(i);
              retval.set(item.track, item);
            });
          }
        }
        aws.config.all_tracks.forEach((k) => {
          if (!retval.has(k))
            retval.set(k, dynamodbScreenControl(undefined, k));
        });
        return retval;
      }
    );
  },

  async updateScreenControl(aws: ApiContext, value: ScreenControlFull) {
    const pk = `${aws.config.tenant}::screen_controls`;
    const sk = `${aws.config.tenant}::screen_controls:${value.track}`;
    const resp = await aws.dynamodb.send(
      new UpdateItemCommand({
        ReturnValues: "ALL_NEW",
        TableName: aws.config.dynamodb_table_name,
        Key: { pk: { S: pk }, sk: { S: sk } },
        UpdateExpression:
          "set #track = :track, #mode = :mode, #rotated_views = :rotated_views, #show_sponsors = :show_sponsors, #intermission = :intermission, #message = :message, #lightning_timer = :lightning_timer, #updated_at = :updated_at",
        ExpressionAttributeNames: {
          "#track": "track",
          "#mode": "mode",
          "#rotated_views": "rotated_views",
          "#show_sponsors": "show_sponsors",
          "#intermission": "intermission",
          "#message": "message",
          "#lightning_timer": "lightning_timer",
          "#updated_at": "updated_at",
        },
        ExpressionAttributeValues: {
          ":track": { S: value.track },
          ":mode": { S: value.mode },
          ":rotated_views": {
            L: value.rotated_views.map((v) => ({
              S: v,
            })),
          },
          ":show_sponsors": { BOOL: value.show_sponsors },
          ":intermission": { BOOL: value.intermission },
          ":message": value.message
            ? {
                M: {
                  heading: value.message.heading
                    ? { S: value.message.heading }
                    : { NULL: true },
                  footer: value.message.footer
                    ? { S: value.message.footer }
                    : { NULL: true },
                },
              }
            : { NULL: true },
          ":lightning_timer": value.lightning_timer
            ? {
                M: {
                  enabled: { BOOL: value.lightning_timer.enabled },
                  tick: value.lightning_timer.tick
                    ? { N: value.lightning_timer.tick.toString() }
                    : { NULL: true },
                  starts_at: { N: value.lightning_timer.starts_at.toString() },
                  ends_at: { N: value.lightning_timer.ends_at.toString() },
                  expires_at: {
                    N: value.lightning_timer.expires_at.toString(),
                  },
                },
              }
            : { NULL: true },
          ":updated_at": { N: dayjs().unix().toString() },
        },
      })
    );
    console.log("updateScreenControl", resp);

    const newVal = dynamodbScreenControl(resp.Attributes);
    mutate(`/.virtual/screen_controls`);
    mutate(`/.virtual/screen_controls/${value.track}`, newVal);
    broadcastMutate(aws, [
      `/.virtual/screen_controls`,
      `/.virtual/screen_controls/${value.track}`,
    ]);
    return newVal;
  },

  //// venue_announcements

  useVenueAnnouncements(aws: ApiContext | null) {
    return useSWR<VenueAnnouncement[]>(
      aws ? `/.virtual/venue_announcements` : null,
      async () => {
        console.log("useVenueAnnouncements mutation");
        if (!aws) throw "aws is null";
        const key = `${aws.config.tenant}::venue_announcements`;
        const paginator = paginateQuery(
          { client: aws.dynamodb },
          {
            TableName: aws.config.dynamodb_table_name,
            ExpressionAttributeValues: {
              ":pk": { S: key },
            },
            KeyConditionExpression: "pk = :pk",
          }
        );
        const possibleItems: Record<string, AttributeValue>[] = [];
        for await (const page of paginator) {
          possibleItems.push(...(page.Items ?? []));
        }
        return possibleItems
          .map((i) => dynamodbVenueAnnouncement(i))
          .sort((a, b) => a.order_index - b.order_index);
      }
    );
  },

  async createVenueAnnouncement(
    aws: ApiContext,
    input: VenueAnnouncementInput
  ) {
    await dynamodbUpdateVenueAnnouncement(aws, true, {
      id: "",
      updated_at: 0,
      tenant: "",
      ...input,
    });
    mutate("/.virtual/venue_announcements");
    broadcastMutate(aws, ["/.virtual/venue_announcements"]);
    return null;
  },

  async updateVenueAnnouncement(aws: ApiContext, input: VenueAnnouncement) {
    await dynamodbUpdateVenueAnnouncement(aws, false, input);
    mutate("/.virtual/venue_announcements");
    broadcastMutate(aws, ["/.virtual/venue_announcements"]);
    return null;
  },

  async deleteVenueAnnouncement(
    aws: ApiContext,
    input: Pick<VenueAnnouncement, "id"> &
      Pick<Partial<VenueAnnouncement>, "tenant">
  ) {
    const pk = `${input.tenant ?? aws.config.tenant}::venue_announcements`;
    const sk = `${pk}:${input.id}`;
    const resp = await aws.dynamodb.send(
      new DeleteItemCommand({
        TableName: aws.config.dynamodb_table_name,
        Key: { pk: { S: pk }, sk: { S: sk } },
      })
    );
    console.log("deleteVenueAnnouncement", resp);
    mutate("/.virtual/venue_announcements");
    broadcastMutate(aws, ["/.virtual/venue_announcements"]);
    return null;
  },

  //// kiosks

  useCurrentKiosk(aws: ApiContext | null) {
    return useSWR<Kiosk | null>(
      aws ? `/.virtual/current_kiosk` : null,
      async () => {
        if (!aws) throw "aws is null";
        const id = aws.identityId;
        const pk = `${aws.config.tenant}::kiosks:${id}`;
        const sk = `${aws.config.tenant}::kiosks`;
        const resp = await aws.dynamodb.send(
          new QueryCommand({
            TableName: aws.config.dynamodb_table_name,
            ExpressionAttributeValues: {
              ":pk": { S: pk },
              ":sk": { S: sk },
            },
            KeyConditionExpression: "pk = :pk AND sk = :sk",
          })
        );
        const possibleItem = resp.Items && resp.Items[0];
        return possibleItem ? dynamodbKiosk(possibleItem) : null;
      }
    );
  },

  async enrollKiosk(aws: ApiContext, input: Pick<Kiosk, "name">) {
    const id = aws.identityId;

    const now = new Date();

    const tenant = aws.config.tenant;

    const sk = `${tenant}::kiosks`;
    const pk = `${sk}:${id}`;

    const resp = await aws.dynamodb.send(
      new UpdateItemCommand({
        TableName: aws.config.dynamodb_table_name,
        Key: { pk: { S: pk }, sk: { S: sk } },
        ReturnValues: "ALL_NEW",
        UpdateExpression: `set #tenant = if_not_exists(#tenant, :tenant), #id = if_not_exists(#id, :id), #name = if_not_exists(#name, :name),  #updated_at = :updated_at`,
        ExpressionAttributeNames: {
          "#tenant": "tenant",
          "#id": "id",
          "#name": ":name",
          "#updated_at": "updated_at",
        },
        ExpressionAttributeValues: {
          ":tenant": { S: tenant },
          ":id": { S: id },
          ":name": { S: input.name },
          ":updated_at": { N: dayjs(now).unix().toString() },
        },
      })
    );
    console.log("enrollKiosk", resp);
    mutate("/.virtual/current_kiosk");
    return resp;
  },

  useKiosks(aws: ApiContext | null) {
    return useSWR<Kiosk[]>(aws ? `/.virtual/kiosks` : null, async () => {
      if (!aws) throw "aws is null";
      const sk = `${aws.config.tenant}::kiosks`;
      const paginator = paginateQuery(
        { client: aws.dynamodb },
        {
          TableName: aws.config.dynamodb_table_name,
          IndexName: "inverted",
          ExpressionAttributeValues: {
            ":sk": { S: sk },
          },
          KeyConditionExpression: "sk = :sk",
        }
      );
      const possibleItems: Record<string, AttributeValue>[] = [];
      for await (const page of paginator) {
        possibleItems.push(...(page.Items ?? []));
      }
      return possibleItems.map((i) => dynamodbKiosk(i));
    });
  },

  async deleteKiosk(
    aws: ApiContext,
    input: Pick<Kiosk, "id"> & Pick<Kiosk, "tenant">
  ) {
    const sk = `${input.tenant ?? aws.config.tenant}::kiosks`;
    const pk = `${sk}:${input.id}`;
    const resp = await aws.dynamodb.send(
      new DeleteItemCommand({
        TableName: aws.config.dynamodb_table_name,
        Key: { pk: { S: pk }, sk: { S: sk } },
      })
    );
    console.log("deleteKiosk", resp);
    mutate("/.virtual/kiosks");
    broadcastMutate(aws, ["/.virtual/kiosks", "/.virtual/current_kiosk"]);
    return null;
  },

  async updateKiosk(aws: ApiContext, input: Kiosk) {
    const sk = `${input.tenant ?? aws.config.tenant}::kiosks`;
    const pk = input.pk ?? `${sk}:${input.id}`;
    const resp = await aws.dynamodb.send(
      new UpdateItemCommand({
        TableName: aws.config.dynamodb_table_name,
        Key: { pk: { S: pk }, sk: { S: sk } },
        ReturnValues: "ALL_NEW",
        UpdateExpression: `set #tenant = #tenant, #id = #id, #name = :name,  #updated_at = :updated_at, #oops_name = :oops_name`,
        ExpressionAttributeNames: {
          "#tenant": "tenant",
          "#id": "id",
          "#name": "name", // FIXME
          "#oops_name": ":name", // FIXME
          "#updated_at": "updated_at",
        },
        ExpressionAttributeValues: {
          ":tenant": { S: input.tenant },
          ":id": { S: input.id },
          ":name": { S: input.name },
          ":oops_name": { NULL: true },
          ":updated_at": { N: dayjs().unix().toString() },
        },
      })
    );
    console.log("updateKiosk", resp);
    mutate("/.virtual/kiosks");
    broadcastMutate(aws, ["/.virtual/kiosks"]);
    return null;
  },

  async reloadKiosk(ctx: ApiContext, input: Pick<Kiosk, "id">) {
    if (ctx.pubsub.state !== "ready") throw "pubsub not ready";
    const payload: ReloadMessage = {
      kind: "Reload",
      ts: dayjs().unix(),
      from: ctx.identityId,
      nonce: ulid(),
    };
    await ctx.pubsub.client.publish({
      qos: mqtt5.QoS.AtLeastOnce,
      topicName: `${ctx.config.iot_topic_prefix}/uplink/kiosk=${input.id}/updates`,
      payload: JSON.stringify(payload),
    });
  },
  async identKiosk(ctx: ApiContext, target: Pick<Kiosk, "id">) {
    if (ctx.pubsub.state !== "ready") return;
    const payload: IdentMessage = {
      kind: "Ident",
      from: ctx.identityId,
      nonce: ulid(),
      ts: dayjs().unix(),
    };
    await ctx.pubsub.client.publish({
      qos: mqtt5.QoS.AtLeastOnce,
      topicName: `${ctx.config.iot_topic_prefix}/uplink/kiosk=${target.id}/updates`,
      payload: JSON.stringify(payload),
    });
  },
};

export default Api;
