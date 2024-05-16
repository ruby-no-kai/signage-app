import React from "react";

import { Flex, Box, Container } from "@chakra-ui/react";
import { Text, Link, Badge, Tooltip } from "@chakra-ui/react";
import { Icon, Avatar } from "@chakra-ui/react";

import type { ChatMessage, ChatSender } from "./Api";

import { Colors } from "./theme";
import { MicIcon } from "./MicIcon";
import { KaigiStaffIcon } from "./KaigiStaffIcon";
import { CommitterIcon } from "./CommitterIcon";

export type Props = {
  message: ChatMessage;
};

export const ChatMessageView: React.FC<Props> = ({ message }) => {
  return (
    <Flex
      w="100%"
      direction="row"
      alignItems="flex-start"
      bg={Colors.baseLight}
      py={"4px"}
      px="15px"
    >
      <ChatMessageAvatar author={message.sender} />
      <Box ml="8px" flexGrow={1} flexShrink={0} flexBasis={0}>
        <ChatMessageAuthor author={message.sender} />
        <Text p={0} m={0} ml={1} fontSize="sm" as="span">
          {React.useMemo(
            () =>
              message.redacted ? (
                <i>[message removed]</i>
              ) : (
                <ChatMessageText content={message.content || ""} />
              ),
            [message.redacted, message.content]
          )}
        </Text>
      </Box>
    </Flex>
  );
};

const ChatMessageAvatar: React.FC<{ author: ChatSender }> = ({ author }) => {
  // if (author.flags.isAdmin) {
  //   // TODO: webp
  //   return (
  //     <Avatar
  //       size="xs"
  //       bg="#ffffff"
  //       src={`/assets/rubykaigi.jpg?p=${CACHE_BUSTER}`}
  //       name=""
  //       loading="lazy"
  //     />
  //   );
  // } else {
  return (
    <Avatar
      size="xs"
      bg={Colors.defaultAvatarBg}
      src={author.avatar_url}
      name=""
      loading="lazy"
    />
  );
  //}
};

const ChatMessageAuthor: React.FC<{
  author: ChatSender;
}> = ({ author }) => {
  const defaultBg = "transparent";
  const flags = author.flags;
  const { bg, fg } = [
    flags.isSpeaker ? { bg: defaultBg, fg: Colors.nameSpeaker } : null,
    flags.isCommitter ? { bg: defaultBg, fg: Colors.nameCore } : null,
  ].filter((v) => !!v)[0] || { bg: defaultBg, fg: Colors.textMuted };

  const icons: JSX.Element[] = [];
  if (flags.isStaff) icons.push(<KaigiStaffIcon key="staff" color={fg} />);
  if (flags.isSpeaker) icons.push(<MicIcon key="speaker" color={fg} />);
  if (flags.isCommitter)
    icons.push(<CommitterIcon key="committer" color={fg} />);

  const tooltipContents: string[] = [];
  if (flags.isStaff) tooltipContents.push("RubyKaigi Staff");
  if (flags.isSpeaker) tooltipContents.push("Speaker");
  if (flags.isCommitter) tooltipContents.push("Ruby Committer");

  return (
    <Tooltip
      label={
        tooltipContents.length > 0 ? tooltipContents.join(", ") : undefined
      }
      display="inline-block"
    >
      <Flex
        display="inline"
        alignItems="center"
        direction="row"
        bgColor={bg}
        borderRadius="4px"
        ml="-4px"
        px="4px"
        py="1px"
      >
        <ChatAuthorName author={author} fg={fg} />
        {icons.length > 0 ? (
          <Text as="span" ml={1} color={fg}>
            {icons}
          </Text>
        ) : null}
      </Flex>
    </Tooltip>
  );
};

const ChatAuthorName: React.FC<{ author: ChatSender; fg: string }> = ({
  author,
  fg,
}) => {
  const fontWeight = "bold";
  const fontSize = "sm";

  return (
    <Text as="span" color={fg} fontWeight={fontWeight} fontSize={fontSize}>
      {author.name}
    </Text>
  );
};

const ChatMessageText: React.FC<{ content: string }> = ({ content }) => {
  return <span>{content}</span>;
};
