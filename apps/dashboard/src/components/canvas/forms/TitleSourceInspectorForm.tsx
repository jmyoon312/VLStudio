import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkles, Type } from 'lucide-react';
import { BarGeometryControlGroup } from './shared';

export interface TitleSourceInspectorFormProps {
  [key: string]: any;
}

export const TitleSourceInspectorForm: React.FC<TitleSourceInspectorFormProps> = (props) => {
  const {
    hasTopTitle, setHasTopTitle,
    titleLinesMode, setTitleLinesMode,
    hasTitleBadge, setHasTitleBadge,
    titleBadgeText, setTitleBadgeText,
    titleBadgeColor, setTitleBadgeColor,
    titleLine1, setTitleLine1,
    titleLine2, setTitleLine2,
    titleLine1SizePx, setTitleLine1SizePx,
    titleLine2SizePx, setTitleLine2SizePx,
    titleLine1Color, setTitleLine1Color,
    titleLine2Color, setTitleLine2Color,
    titleStroke, setTitleStroke,
    titleStrokeWidth, setTitleStrokeWidth,
    titleStrokeColor, setTitleStrokeColor,
    titleShadow, setTitleShadow,
    titleShadowBlur, setTitleShadowBlur,
    titleShadowColor = '#000000', setTitleShadowColor = () => {},
    titleBgMode, setTitleBgMode,
    titleBgColor = '#000000', setTitleBgColor = () => {},
    titlePaddingX, setTitlePaddingX,
    titleBorderRadius, setTitleBorderRadius,
    hasTopBarBg, setHasTopBarBg,
    topBarBg, setTopBarBg,
    topBarHeightPct, setTopBarHeightPct,
    hasBottomBarBg, setHasBottomBarBg,
    bottomBarBg, setBottomBarBg,
    bottomBarHeightPct, setBottomBarHeightPct,
    hasBottomSource, setHasBottomSource,
    bottomSourceText, setBottomSourceText,
    bottomSourceColor, setBottomSourceColor,
    bottomSourceBottomPct, setBottomSourceBottomPct,
    sourceTransform, setSourceTransform = () => {},
    handleInjectTitleCandidate,
  } = props;

  const onInjectTitle = handleInjectTitleCandidate || ((cand: string) => {
    if (cand.includes(']')) {
      const parts = cand.split(']');
      const badge = parts[0].replace('[', '').trim();
      const rest = parts.slice(1).join(']').trim();
      if (setHasTitleBadge) setHasTitleBadge(true);
      if (setTitleBadgeText) setTitleBadgeText(badge);
      if (titleLinesMode === 'double' && rest.includes(' ')) {
        const words = rest.split(' ');
        const mid = Math.ceil(words.length / 2);
        if (setTitleLine1) setTitleLine1(words.slice(0, mid).join(' '));
        if (setTitleLine2) setTitleLine2(words.slice(mid).join(' '));
      } else {
        if (setTitleLine1) setTitleLine1(rest);
      }
    } else {
      if (setTitleLine1) setTitleLine1(cand);
    }
  });

  return (
<div className="space-y-3">
                {/* 상단 고정 타이틀 카드 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-foreground">상단 고정 타이틀</span>
                    </div>
                    <Switch checked={hasTopTitle} onCheckedChange={setHasTopTitle} />
                  </div>

                  {hasTopTitle && (
                    <div className="space-y-2.5">
                      {/* ⚡ 8대 쇼츠 고효율 타이틀 후보군 퀵 주입기 */}
                      <div className="p-2 bg-primary/5 border border-primary/20 rounded-[2px] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-primary flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            추천 타이틀 퀵 주입 (8대 후보군)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-0.5">
                          {[
                            '[충격 실화] 상상도 못했던 반전 결말',
                            '[긴급 속보] 지금 당장 확인해야 할 사실',
                            '[TOP 1%] 성공한 사람들의 숨겨진 비밀',
                            '[소름 주의] 이것을 알고 나면 달라집니다',
                            '[핵심 요약] 단 1분 만에 끝내는 완벽 정리',
                            '[진짜 이유] 아무도 알려주지 않았던 진실',
                            '[실제 상황] 눈앞에서 벌어진 믿기 힘든 일',
                            '[궁극의 팁] 알고 나면 삶이 편해지는 비법',
                          ].map((cand, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => onInjectTitle(cand)}
                              className="text-left px-2 py-1 text-[10px] rounded-[2px] bg-card hover:bg-primary/10 border border-border/70 hover:border-primary/40 text-foreground transition truncate cursor-pointer font-medium"
                              title={`${cand} (클릭 시 상단 타이틀로 즉시 주입)`}
                            >
                              {cand}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 1줄 vs 2줄 모드 선택 */}
                      <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-[2px]">
                        <span className="text-[10px] font-semibold text-foreground">줄 수 설정</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTitleLinesMode('single')}
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                              titleLinesMode === 'single'
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            1줄 고정
                          </button>
                          <button
                            type="button"
                            onClick={() => setTitleLinesMode('double')}
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                              titleLinesMode === 'double'
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            2줄 고정 (추천)
                          </button>
                        </div>
                      </div>

                      {/* 뱃지 설정 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-semibold">상단 뱃지 태그</span>
                          <Switch checked={hasTitleBadge} onCheckedChange={setHasTitleBadge} />
                        </div>
                        {hasTitleBadge && (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={titleBadgeText}
                              onChange={(e) => setTitleBadgeText(e.target.value)}
                              className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                              placeholder="HOT ISSUE"
                            />
                            <input
                              type="color"
                              value={titleBadgeColor}
                              onChange={(e) => setTitleBadgeColor(e.target.value)}
                              className="w-7 h-7 p-0 border border-border rounded-[2px] cursor-pointer bg-transparent"
                              title="뱃지 배경색"
                            />
                          </div>
                        )}
                      </div>

                      {/* 1단 타이틀 (위 텍스트) */}
                      <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-semibold">1단 텍스트 (상단)</span>
                          <span className="font-mono text-primary font-bold">{titleLine1SizePx}px</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={titleLine1}
                            onChange={(e) => setTitleLine1(e.target.value)}
                            className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                            placeholder="1단 타이틀 입력..."
                          />
                          <input
                            type="color"
                            value={titleLine1Color}
                            onChange={(e) => setTitleLine1Color(e.target.value)}
                            className="w-7 h-7 p-0 border border-border rounded-[2px] cursor-pointer bg-transparent"
                            title="1단 글자 색상"
                          />
                        </div>
                        <input
                          type="range"
                          min="14"
                          max="40"
                          value={titleLine1SizePx}
                          onChange={(e) => setTitleLine1SizePx(parseInt(e.target.value))}
                          className="w-full accent-primary cursor-pointer h-1 bg-muted"
                        />
                      </div>

                      {/* 2단 타이틀 (아래 텍스트 - double 모드일 때) */}
                      {titleLinesMode === 'double' && (
                        <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-foreground font-semibold">2단 텍스트 (하단 핵심 후킹)</span>
                            <span className="font-mono text-amber-500 font-bold">{titleLine2SizePx}px</span>
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={titleLine2}
                              onChange={(e) => setTitleLine2(e.target.value)}
                              className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                              placeholder="2단 타이틀 입력..."
                            />
                            <input
                              type="color"
                              value={titleLine2Color}
                              onChange={(e) => setTitleLine2Color(e.target.value)}
                              className="w-7 h-7 p-0 border border-border rounded-[2px] cursor-pointer bg-transparent"
                              title="2단 글자 색상"
                            />
                          </div>
                          <input
                            type="range"
                            min="16"
                            max="44"
                            value={titleLine2SizePx}
                            onChange={(e) => setTitleLine2SizePx(parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                          />
                        </div>
                      )}

                      {/* 🎨 테두리(외곽선) 상세 제어 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                          <Switch checked={titleStroke} onCheckedChange={setTitleStroke} />
                        </div>
                        {titleStroke && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">두께: {titleStrokeWidth}px</span>
                              <input
                                type="color"
                                value={titleStrokeColor}
                                onChange={(e) => setTitleStrokeColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                                title="테두리 색상"
                              />
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={titleStrokeWidth}
                              onChange={(e) => setTitleStrokeWidth(parseInt(e.target.value))}
                              className="w-full accent-primary cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 🌌 그림자 상세 제어 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                          <Switch checked={titleShadow} onCheckedChange={setTitleShadow} />
                        </div>
                        {titleShadow && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">흐림: {titleShadowBlur}px</span>
                              <input
                                type="color"
                                value="#000000"
                                onChange={(e) => setTitleShadowColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                                title="그림자 색상"
                              />
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={titleShadowBlur}
                              onChange={(e) => setTitleShadowBlur(parseInt(e.target.value))}
                              className="w-full accent-primary cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 🔲 배경 박스 & 모서리 둥글기 제어 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">배경 박스</span>
                          <div className="flex gap-1">
                            {(['none', 'box', 'pill'] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setTitleBgMode(m)}
                                className={cn(
                                  "px-1.5 py-0.5 text-[9px] rounded font-medium",
                                  titleBgMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}
                              >
                                {m === 'none' ? '없음' : m === 'box' ? '박스' : '알약'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {titleBgMode !== 'none' && (
                          <div className="space-y-2 pt-1 border-t border-border/50">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">배경 색상</span>
                              <input
                                type="color"
                                value="#000000"
                                onChange={(e) => setTitleBgColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                              />
                            </div>
                            {titleBgMode === 'box' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-muted-foreground">모서리 모양 (둥글기)</span>
                                  <span className="font-mono text-primary">{titleBorderRadius}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="30"
                                  value={titleBorderRadius}
                                  onChange={(e) => setTitleBorderRadius(parseInt(e.target.value))}
                                  className="w-full accent-primary cursor-pointer h-1 bg-muted"
                                />
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">내부 패딩</span>
                                <span className="font-mono">{titlePaddingX}px</span>
                              </div>
                              <input
                                type="range"
                                min="2"
                                max="30"
                                value={titlePaddingX}
                                onChange={(e) => setTitlePaddingX(parseInt(e.target.value))}
                                className="w-full accent-primary cursor-pointer h-1 bg-muted"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 하단 출처 표기 카드 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground">하단 출처 표기</span>
                    <Switch checked={hasBottomSource} onCheckedChange={setHasBottomSource} />
                  </div>
                  {hasBottomSource && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={bottomSourceText}
                        onChange={(e) => setBottomSourceText(e.target.value)}
                        className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-medium"
                      />
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">글자 색상</span>
                        <input
                          type="color"
                          value={bottomSourceColor}
                          onChange={(e) => setBottomSourceColor(e.target.value)}
                          className="w-6 h-6 p-0 border border-border rounded cursor-pointer bg-transparent"
                        />
                      </div>

                      {/* 하단 출처 표기 세부 위치 & 높낮이 */}
                      <div className="space-y-2 pt-2 border-t border-border/80">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-foreground">🏷️ 하단 출처 표기 바닥 위치 (Y)</span>
                          <span className="font-mono text-primary font-bold">{bottomSourceBottomPct.toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="0.5"
                          value={bottomSourceBottomPct}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setBottomSourceBottomPct(val);
                            setSourceTransform((prev: any) => ({ ...prev, yPct: 100 - val }));
                          }}
                          className="w-full accent-primary cursor-pointer h-1 bg-muted"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>0% (맨 바닥)</span>
                          <span>하단 바 위/안쪽 자유 배치</span>
                          <span>25%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 상단 및 하단 배경 바 카드 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground">상하단 배경 바</span>
                  </div>
                  <BarGeometryControlGroup
                    label="상단 배경 바"
                    enabled={hasTopBarBg}
                    setEnabled={setHasTopBarBg}
                    bgColor={topBarBg}
                    setBgColor={setTopBarBg}
                    heightPct={topBarHeightPct}
                    setHeightPct={setTopBarHeightPct}
                  />
                  <BarGeometryControlGroup
                    label="하단 배경 바"
                    enabled={hasBottomBarBg}
                    setEnabled={setHasBottomBarBg}
                    bgColor={bottomBarBg}
                    setBgColor={setBottomBarBg}
                    heightPct={bottomBarHeightPct}
                    setHeightPct={setBottomBarHeightPct}
                  />
                </div>
              </div>
  );
};

export default TitleSourceInspectorForm;
