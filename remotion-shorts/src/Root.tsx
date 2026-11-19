import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { LighthouseKeeperShort, LIGHTHOUSE_FRAMES } from "./videos/lighthouse-keeper/Lighthouse";
import { LighthouseGhostShort, GHOST_FRAMES } from "./videos/lighthouse-ghost/Ghost";
import { DeadEndJobShort, DEADEND_FRAMES } from "./videos/dead-end-job/DeadEnd";
import { NvidiaJensenHuangShort, NVIDIA_JENSEN_FRAMES } from "./videos/nvidia-jensen-huang/Jensen";
import { AirbnbObamaOsShort, AIRBNB_OBAMA_OS_FRAMES } from "./videos/airbnb-obama-os/Airbnb";
import { MaoZedong3Short, MAO3_FRAMES } from "./videos/mao-zedong-3/Mao3";

// One <Composition> per short. New shorts are registered below the bridge (template / smoke test).
export const Root: React.FC = () => (
  <>
    <Composition id="mao-zedong-3" component={MaoZedong3Short} durationInFrames={MAO3_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="airbnb-obama-os" component={AirbnbObamaOsShort} durationInFrames={AIRBNB_OBAMA_OS_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="nvidia-jensen-huang" component={NvidiaJensenHuangShort} durationInFrames={NVIDIA_JENSEN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DeadEndJobShort" component={DeadEndJobShort} durationInFrames={DEADEND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LighthouseGhostShort" component={LighthouseGhostShort} durationInFrames={GHOST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LighthouseKeeperShort" component={LighthouseKeeperShort} durationInFrames={LIGHTHOUSE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
