import type { CSSProperties } from "react";

export type IconName =
  | "helix"
  | "layers"
  | "shield"
  | "pulse"
  | "doc"
  | "hash"
  | "clipboard"
  | "chart"
  | "lock"
  | "check"
  | "alert"
  | "arrow"
  | "plug"
  | "gauge"
  | "fingerprint"
  | "users";

type Props = {
  name: IconName;
  className?: string;
  size?: number;
  style?: CSSProperties;
};

// References a symbol from <Sprite/> (rendered once in the root layout).
export function Icon({ name, className = "ico", size, style }: Props) {
  const dim = size ? { width: size, height: size } : undefined;
  return (
    <svg className={className} style={{ ...dim, ...style }} aria-hidden="true" focusable="false">
      <use href={`#i-${name}`} />
    </svg>
  );
}
