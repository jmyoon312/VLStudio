import React from "react";

export interface ColorPalettePickerProps {
  label: string;
  color: string;
  onChange: (newColor: string) => void;
  className?: string;
}

const VIRAL_SWATCHES = [
  { label: "네온 옐로우", color: "#FFE600" },
  { label: "사이버 시안", color: "#00FFCC" },
  { label: "하이 핑크", color: "#FF3366" },
  { label: "화이트", color: "#FFFFFF" },
  { label: "블랙", color: "#000000" },
  { label: "다크 차콜", color: "#18181B" },
];

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  label,
  color,
  onChange,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-between space-x-2 ${className}`}>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center space-x-1.5">
        {/* 추천 바이럴 스와치 */}
        {VIRAL_SWATCHES.map((swatch) => (
          <button
            key={swatch.color}
            onClick={() => onChange(swatch.color)}
            className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
              color.toUpperCase() === swatch.color.toUpperCase()
                ? "scale-125 border-primary ring-1 ring-primary shadow-xs"
                : "border-border hover:scale-110"
            }`}
            style={{ backgroundColor: swatch.color }}
            title={`${swatch.label} (${swatch.color})`}
          />
        ))}

        {/* 직접 색상 선택 input */}
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border border-border bg-transparent p-0"
          title="직접 색상 선택"
        />
      </div>
    </div>
  );
};
