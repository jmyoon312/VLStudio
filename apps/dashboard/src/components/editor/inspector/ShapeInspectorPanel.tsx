import React from "react";
import { ShapeLayer, ShapeRole } from "../../../types/blueprintV4";
import { ScrubInput } from "./ScrubInput";

export interface ShapeInspectorPanelProps {
  layer: ShapeLayer;
  onChange: (patch: Partial<ShapeLayer>) => void;
  className?: string;
}

const SHAPE_ROLES: { label: string; value: ShapeRole }[] = [
  { label: "훅 밴드 (Hook Band)", value: "hook_band" },
  { label: "긴급 배너 (Urgent Banner)", value: "urgent_banner" },
  { label: "베댓 카드 (Comment Card)", value: "comment_card" },
  { label: "구분선 (Divider)", value: "divider" },
  { label: "어두운 오버레이 (Dimmed)", value: "dimmed_overlay" },
  { label: "홀 마스크 (Hole Mask)", value: "hole_mask" },
];

export const ShapeInspectorPanel: React.FC<ShapeInspectorPanelProps> = ({
  layer,
  onChange,
  className = "",
}) => {
  return (
    <div className={`space-y-3 p-3 bg-card rounded-xl border border-border select-none ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>쉐이프 속성 (Shape & Style)</span>
        <span className="text-[10px] text-primary font-mono">{layer.shapeRole}</span>
      </div>

      {/* 쉐이프 역할 선택 */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">역할 (Role)</label>
        <select
          value={layer.shapeRole}
          onChange={(e) => onChange({ shapeRole: e.target.value as ShapeRole })}
          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
        >
          {SHAPE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* 채우기 색상 */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-muted-foreground flex items-center justify-between">
          <span>채우기 색상 (Fill)</span>
          <span className="font-mono text-[10px] text-foreground">{layer.fillColor}</span>
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={layer.fillColor || "#000000"}
            onChange={(e) => onChange({ fillColor: e.target.value })}
            className="w-8 h-8 rounded-lg border border-border bg-transparent cursor-pointer"
          />
          <div className="flex items-center space-x-1 flex-1">
            {["#000000", "#18181B", "#FFE600", "#EF4444", "#3B82F6", "#FFFFFF"].map((c) => (
              <button
                key={c}
                onClick={() => onChange({ fillColor: c })}
                className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                  layer.fillColor === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 모서리 둥글기 및 테두리 두께 */}
      <div className="grid grid-cols-2 gap-2">
        <ScrubInput
          label="둥글기"
          value={layer.borderRadius}
          onChange={(val) => onChange({ borderRadius: val })}
          min={0}
          max={100}
          unit="px"
        />
        <ScrubInput
          label="테두리"
          value={layer.borderWidth}
          onChange={(val) => onChange({ borderWidth: val })}
          min={0}
          max={20}
          unit="px"
        />
      </div>

      {/* 테두리 색상 (두께 > 0일 때) */}
      {layer.borderWidth > 0 && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>테두리 색상 (Border)</span>
            <span className="font-mono text-[10px] text-foreground">{layer.borderColor || "#FFFFFF"}</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={layer.borderColor || "#FFFFFF"}
              onChange={(e) => onChange({ borderColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-border bg-transparent cursor-pointer"
            />
            <div className="flex items-center space-x-1 flex-1">
              {["#FFFFFF", "#27272A", "#FFE600", "#3B82F6", "#000000"].map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ borderColor: c })}
                  className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                    layer.borderColor === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 불투명도 */}
      <div className="pt-1">
        <ScrubInput
          label="불투명도"
          value={Math.round(layer.opacity * 100)}
          onChange={(val) => onChange({ opacity: val / 100 })}
          min={0}
          max={100}
          unit="%"
        />
      </div>
    </div>
  );
};
