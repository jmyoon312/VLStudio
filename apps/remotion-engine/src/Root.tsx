import React from "react";
import { Composition } from "remotion";
import {
  ViraShortComposition,
  ViraShortProps,
} from "./compositions/ViraShortComposition";
import {
  SongKaraokeComposition,
  SongKaraokeProps,
  defaultSongKaraokeProps,
} from "./compositions/SongKaraokeComposition";

import {
  StockMotionComposition,
  StockMotionProps,
  defaultStockMotionProps,
} from "./compositions/StockMotionComposition";
import {
  IlbunIlchoShortsComposition,
  IlbunIlchoShortsProps,
} from "./compositions/IlbunIlchoShortsComposition";
import {
  UniversalSovereignShortsComposition,
  UniversalSovereignShortsProps,
} from "./compositions/UniversalSovereignShortsComposition";

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
      <Composition
        id="SongKaraokeComposition"
        component={SongKaraokeComposition}
        durationInFrames={900} // Default 30s @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultSongKaraokeProps}
      />
      <Composition
        id="StockMotionComposition"
        component={StockMotionComposition}
        durationInFrames={120} // ~4s default @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultStockMotionProps}
      />
      <Composition
        id="IlbunIlchoShortsComposition"
        component={IlbunIlchoShortsComposition}
        durationInFrames={300} // Default 10s @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          titleLine1: "하루 1분 투자로",
          titleLine2: "인생을 바꾸는 기적의 습관",
          titleLine1Color: "#FFE500",
          titleLine2Color: "#FF2222",
          titleFontSize: 74,
          subtitles: [
            { text: "아침에 일어나자마자 [물 한 잔]을 마시면", startMs: 500, endMs: 3200 },
            { text: "신진대사가 **20%** 급격히 활성화됩니다", startMs: 3300, endMs: 6500 },
            { text: "지금 당장 [물 한 컵]을 준비해보세요!", startMs: 6600, endMs: 9800 }
          ],
          subtitleFontSize: 68,
          sourceCreditText: "출처: 일분일초 공식",
          topBarHeight: 270,
          bottomBarHeight: 470
        }}
      />
      <Composition
        id="UniversalSovereignShortsComposition"
        component={UniversalSovereignShortsComposition}
        durationInFrames={300} // Default 10s @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          titleLine1: "흡연자 노트북을",
          titleLine1Y: 276,
          titleLine1Color: "#FFE500",
          titleLine1Size: 84,
          titleLine1Stroke: 5.5,
          titleLine2: "중고로 사면 생기는 일",
          titleLine2Y: 415,
          titleLine2Color: "#FF2222",
          titleLine2Size: 76,
          titleLine2Stroke: 5.5,
          titleFontFamily: "'YeogiOttaeJalnan', 'SBAggroB', sans-serif",
          topBarHeight: 515,
          bottomBarHeight: 468,
          subtitleBottom: 540,
          subtitleFontSize: 66,
          subtitleFontFamily: "'BMDOHYEON', 'SCoreDream', sans-serif",
          subtitles: [
            { text: "아침에 일어나자마자 [물 한 잔]을 마시면", startMs: 500, endMs: 3200 },
            { text: "신진대사가 **20%** 급격히 활성화됩니다", startMs: 3300, endMs: 6500 },
            { text: "지금 당장 [물 한 컵]을 준비해보세요!", startMs: 6600, endMs: 9800 }
          ],
          sourceCreditText: "출처: 일분일초 공식"
        }}
      />
    </>
  );
};


