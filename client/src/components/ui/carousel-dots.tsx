import React from "react";
import { cn } from "@/lib/utils";

type DotButtonProps = {
  selected: boolean;
  onClick: () => void;
};

export const DotButton: React.FC<DotButtonProps> = ({ selected, onClick }) => {
  return (
    <button
      className={cn(
        "w-3 h-3 rounded-full mx-1 transition-all duration-300",
        selected ? "bg-primary scale-125" : "bg-muted hover:bg-muted-foreground/50"
      )}
      type="button"
      onClick={onClick}
      aria-label="Carousel dot button"
    />
  );
};