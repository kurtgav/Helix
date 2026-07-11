import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  children: ReactNode;
}

export function Card({ elevated = false, className, children, ...rest }: CardProps) {
  const classes = ["card", elevated ? "card--elevated" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["card__body", className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}
