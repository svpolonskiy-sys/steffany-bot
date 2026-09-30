import type { ReactNode } from "react";
import { Arrow } from "./icons";

type Props = {
  href: string;
  variant?: "primary" | "secondary" | "mint";
  children: ReactNode;
  arrow?: boolean;
  small?: boolean;
  className?: string;
  onClick?: () => void;
};

export function LinkButton({ href, variant = "primary", children, arrow = true, small, className = "", onClick }: Props) {
  return (
    <a href={href} onClick={onClick} className={`btn btn-${variant}${small ? " btn-sm" : ""} ${className}`}>
      {children}
      {arrow && <Arrow />}
    </a>
  );
}
