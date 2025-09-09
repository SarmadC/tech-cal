"use client";
import React, { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(40% 80% at 50% 0%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
    LEFT: "radial-gradient(40% 80% at 0% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
    BOTTOM:
      "radial-gradient(40% 80% at 50% 100%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
    RIGHT:
      "radial-gradient(40% 80% at 100% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
  };

  const highlight =
    "radial-gradient(75% 181.15942028985506% at 50% 50%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.1) 100%)";

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection((prevState) => {
          const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
          const currentIndex = directions.indexOf(prevState);
          const nextIndex = clockwise
            ? (currentIndex - 1 + directions.length) % directions.length
            : (currentIndex + 1) % directions.length;
          return directions[nextIndex];
        });
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, duration, clockwise]);
  return (
    <Tag
      onMouseEnter={(_event: React.MouseEvent<HTMLDivElement>) => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex rounded-full border-0 content-center bg-transparent hover:bg-transparent transition duration-500 items-center flex-col flex-nowrap gap-10 h-min justify-center overflow-visible p-[4px] decoration-clone w-fit",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "w-auto text-white z-10 px-4 py-2 rounded-[inherit]",
          className
        )}
      >
        {children}
      </div>
      <motion.div
        className={cn(
          "flex-none inset-0 overflow-hidden absolute z-[0] rounded-[inherit]"
        )}
        style={{
          filter: "blur(0px)",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />
      <div className="bg-black absolute z-[1] flex-none inset-[2px] rounded-[100px]" />
    </Tag>
  );
}
