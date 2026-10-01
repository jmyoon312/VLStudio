import React from "react";

export type BackdropType = "studio" | "transparent" | "clean_white" | "pure_black" | "cyber_neon";

export interface MockupBackdropSelectorProps {
  currentBackdrop: BackdropType;
  onChangeBackdrop: (backdrop: BackdropType) => void;
  className?: string;
}

export const BACKDROP_CONFIGS: Record<BackdropType, { label: string; style: React.CSSProperties }> = {
  studio: {
    label: "스튜디오",
    style: {
      background: "radial-gradient(circle at center, #27272a 0%, #09090b 100%)",
    },
  },
  transparent: {
    label: "체커보드",
    style: {
      backgroundImage:
        "linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)",
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      backgroundColor: "#18181b",
    },
  },
  clean_white: {
    label: "클린 화이트",
    style: {
      backgroundColor: "#FFFFFF",
    },
  },
  pure_black: {
    label: "퓨어 블랙",
    style: {
      backgroundColor: "#000000",
    },
  },
  cyber_neon: {
    label: "사이버 네온",
    style: {
      background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
    },
  },
};

export const MockupBackdropSelector: React.FC<MockupBackdropSelectorProps> = ({
  currentBackdrop,
  onChangeBackdrop,
  className = "",
}) => {
  return (
    <div className={`flex items-center space-x-1 bg-card/95 border border-border p-1 rounded-lg shadow-xs ${className}`}>
      {(Object.keys(BACKDROP_CONFIGS) as BackdropType[]).map((key) => {
        const item = BACKDROP_CONFIGS[key];
        const isActive = currentBackdrop === key;
        return (
          <button
            key={key}
            onClick={() => onChangeBackdrop(key)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
              isActive
                ? "bg-primary/15 text-primary border border-primary/40 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={item.label}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
