import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "dark";
}

const Card = ({ children, className = "", tone = "default" }: CardProps) => {
  return <section className={`card card--${tone} ${className}`}>{children}</section>;
};

export default Card;
