import React from "react";
import { Composition } from "remotion";
import {
  ViraShortComposition,
  ViraShortProps,
} from "./compositions/ViraShortComposition";

const defaultProps: ViraShortProps = {
  titleHook: "0.8초 쨉쨉이 충격 반전!",
  accentColor: "#FFE600",
  subtitles: [
    { text: "지금 보고 계신 이 장면...", startMs: 0, endMs: 2500 },
    { text: "결말을 절대 예측할 수 없습니다!", startMs: 2500, endMs: 5000 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ViraShortComposition"
        component={ViraShortComposition}
        durationInFrames={900} // Default 30s @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};
