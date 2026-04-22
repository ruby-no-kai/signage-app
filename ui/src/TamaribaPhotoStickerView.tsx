import { useEffect, useState } from "react";
import { Box, Flex, Image, Spinner, Center, Text } from "@chakra-ui/react";
import useSWR from "swr";
import { Logo } from "./Logo";
import { ScreenColors } from "./theme";
import { useTick } from "./TickProvider";

type Manifest = {
  images: Array<{ path: string }>;
};

const PHOTOS_BASE_PATH = "/data/photos/";
const ROTATE_INTERVAL = 12;

export const TamaribaPhotoStickerView: React.FC = () => {
  const { data: manifest, error } = useSWR<Manifest>(
    `${PHOTOS_BASE_PATH}manifest.json`,
    (url) => fetch(url).then((res) => res.json()),
    { revalidateOnFocus: false }
  );

  const tick = useTick();
  const pairIndex = Math.floor(tick.unix() / ROTATE_INTERVAL);
  const currentPair = pickPair(manifest?.images, pairIndex);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = pickPair(manifest?.images, pairIndex);
    if (!current) return;
    setReady(false);
    Promise.all(current.map(preloadImage)).then(() => setReady(true));
    pickPair(manifest?.images, pairIndex + 1)?.forEach(preloadImage);
  }, [manifest, pairIndex]);

  if (error) {
    return (
      <Center w="100%" h="100%" flexDirection="column" gap={2}>
        <Text color="red.500">Failed to load manifest</Text>
        <Text fontSize="sm" color="gray.600">
          {error.message}
        </Text>
      </Center>
    );
  }

  if (!currentPair || !ready) {
    return (
      <Center w="100%" h="100%">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Center>
    );
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      w="100vw"
      h="56.25vw"
      zIndex={10}
      backgroundColor="white"
    >
      <Box
        w="100%"
        h="100%"
        bgImage="url(/photosticker-bg.svg)"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
      >
        <Flex
          w="100%"
          h="100%"
          justify="center"
          align="flex-start"
          gap="25%"
          pt="10%"
          pr="2%"
        >
          {currentPair.map((url, i) => (
            <Box key={url} w="19%" transform={`rotate(${i === 0 ? 5 : -5}deg)`}>
              <Image
                src={url}
                alt={`Photo sticker ${i + 1}`}
                w="100%"
                h="auto"
                objectFit="contain"
                loading="eager"
              />
            </Box>
          ))}
        </Flex>
      </Box>
      <Footer />
    </Box>
  );
};

export default TamaribaPhotoStickerView;

const Footer = () => (
  <Box
    display="flex"
    position="absolute"
    justifyContent="space-between"
    alignItems="center"
    bottom="0"
    left="0"
    w="100vw"
    h="5.1vw"
    zIndex={10}
    bgColor={ScreenColors.accent}
    px="2vw"
    css={{
      "& svg": { height: "100%", width: "auto" },
      "& img": { height: "100%", width: "auto" },
    }}
  >
    <Logo />
    <Box h="40%" display="flex" alignItems="center">
      <img src="/smarthr-logo.svg" alt="SmartHR" />
    </Box>
  </Box>
);

const pickPair = (
  images: Manifest["images"] | undefined,
  pairIndex: number
): [string, string] | null => {
  if (!images || images.length < 2) return null;
  const pairCount = Math.floor(images.length / 2);
  const i = ((pairIndex % pairCount) + pairCount) % pairCount;
  return [
    `${PHOTOS_BASE_PATH}${images[i * 2].path}`,
    `${PHOTOS_BASE_PATH}${images[i * 2 + 1].path}`,
  ];
};

const preloadImage = (url: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.error(`Failed to load image: ${url}`);
      resolve();
    };
    img.src = url;
  });
