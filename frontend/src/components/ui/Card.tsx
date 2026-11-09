import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className, hoverEffect = true, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl p-6 transition-all duration-300",
        hoverEffect ? "glass-card hover:-translate-y-1" : "glass-panel",
        className
      )}
    >
      {children}
    </div>
  );
}
