import React from "react";
import { Composition } from "remotion";
import {
  ViraShortComposition,
  ViraShortProps,
} from "./compositions/ViraShortComposition";

const defaultProps: ViraShortProps = {
  hasTopHeader: true,
  hasTitleBadge: true,
  titleBadgeText: "속보",
  titleBadgeBg: "#EF4444",
  titleBadgeColor: "#FFFFFF",
  titleLine1: "조코비치 몰래카메라 ㅋㅋ",
  titleLine2: "상대 선수 멘붕 직전",
  titleLine1Color: "#FFFFFF",
  titleLine2Color: "#FFE500",
  hasBottomCredit: true,
  bottomCreditText: "출처: 공식 유튜브 영상",
  jabOverlay: {
    text: "*출격작전 반전 순간!*",
    startMs: 2500,
    endMs: 7000,
    placement: "top-third",
    tiltDeg: -3,
  },
  subtitles: [
    { text: "바이럴루프 정밀 템플릿 실시간 프리뷰", startMs: 0, endMs: 5000 },
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
