import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { ChakraProvider, Container, useToast } from "@chakra-ui/react";
import { theme } from "./theme";

import { AuthProvider } from "./AuthProvider";

import ControlNavbar from "./ControlNavbar";

import OAuthCallbackPage from "./OAuthCallbackPage";
import TestPage from "./TestPage";
import ControlVenueAnnouncementsPage from "./ControlVenueAnnouncementsPage";
import ControlScreenPage from "./ControlScreenPage";
import { SWRConfig } from "swr";
import { errorToToast } from "./ErrorAlert";
import { PubsubProvider } from "./PubsubProvider";
import { ApiPubsubReceiver } from "./ApiPubsubReceiver";
import { ScreenPage } from "./ScreenPage";
import {
  KioskContextData,
  KioskProvider,
  useKioskPropsFromSearch,
} from "./KioskProvider";
import ControlLightningTimerPage from "./ControlLightningTimerPage";

const ControlLayout: React.FC = () => {
  const toast = useToast();
  const swrOnError = (error: Error, key: string) => {
    console.error(error, key);
    toast({ ...errorToToast(error), duration: 5000 });
  };
  return (
    <>
      <SWRConfig value={{ onError: swrOnError }}>
        <ControlNavbar />
        <Container
          maxW={["auto", "auto", "auto", "1700px"]}
          px={["0px", "0px", "15px", "15px"]}
          py="22px"
        >
          <Outlet />
        </Container>
      </SWRConfig>
    </>
  );
};

const KioskLayout: React.FC<{ props?: KioskContextData }> = ({ props }) => {
  const toast = useToast();
  const swrOnError = (error: Error, key: string) => {
    console.error(error, key);
    toast({ ...errorToToast(error), duration: 2000 });
  };
  const searchProps = useKioskPropsFromSearch();
  const kioskProps = props ?? searchProps;
  return (
    <>
      <SWRConfig value={{ onError: swrOnError }}>
        <KioskProvider {...kioskProps}>
          <Outlet />
        </KioskProvider>
      </SWRConfig>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <PubsubProvider>
          <ApiPubsubReceiver />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate replace to="/screen" />} />

              <Route path="/test" element={<TestPage />} />
              <Route path="/oauth2callback" element={<OAuthCallbackPage />} />

              <Route element={<KioskLayout />}>
                <Route path="screen" element={<ScreenPage />} />
                {/*<Route path="/subscreen" element={<SubScreen />} />*/}
              </Route>
              <Route
                element={
                  <KioskLayout props={{ track: "_hallway", kind: "hallway" }} />
                }
              >
                <Route path="hallway" element={<ScreenPage />} />
              </Route>

              <Route path="/control" element={<ControlLayout />}>
                <Route
                  path="announcements"
                  element={<ControlVenueAnnouncementsPage />}
                />
                <Route path="screens" element={<ControlScreenPage />} />
                <Route path="timers" element={<ControlLightningTimerPage />} />
              </Route>
              {/* 

            <Route index element={<ControlRoot />} />
            <Route path="kiosks" element={<ControlKiosksPage />} />
          */}
            </Routes>
          </BrowserRouter>
        </PubsubProvider>
      </AuthProvider>
    </ChakraProvider>
  );
};
