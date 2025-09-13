"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";

import React, { useRef, useState } from "react";


interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      className={cn("absolute inset-x-0 top-4 z-50 w-full pointer-events-none", className)}
    >
      <div className="pointer-events-auto">
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<{ visible?: boolean }>,
                { visible },
              )
            : child,
        )}
      </div>
    </motion.div>
  );
};

export const NavBody = ({ children, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        scale: visible ? 0.95 : 1,
        y: visible ? 8 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 40,
      }}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "4px",
          padding: "6px",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "9999px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          zIndex: 60,
          position: "relative",
          margin: 0,
          boxSizing: "border-box",
          width: "fit-content",
          minWidth: "400px",
          height: "fit-content",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
};

export const NavItems = ({ items, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        margin: 0,
        padding: 0,
        flex: 1,
      }}
    >
      {items.map((item, idx) => (
        <a
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          key={`link-${idx}`}
          href={item.link}
          style={{
            position: "relative",
            padding: "6px 12px",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "14px",
            fontWeight: "500",
            textDecoration: "none",
            borderRadius: "9999px",
            transition: "color 0.2s ease",
            margin: 0,
            zIndex: 10,
            display: "block",
            whiteSpace: "nowrap",
          }}
          onMouseOver={(e) => {
            setHovered(idx);
            e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
          }}
          onMouseOut={(e) => {
            setHovered(null);
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
          }}
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "9999px",
                zIndex: 1,
              }}
            />
          )}
          <span style={{
            position: "relative",
            zIndex: 20,
          }}>
            {item.name}
          </span>
        </a>
      ))}
    </div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "90%" : "100%",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "4px" : "2rem",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-2 lg:hidden",
        visible && "bg-white/80 dark:bg-neutral-950/80",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] dark:bg-neutral-950",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return isOpen ? (
    <IconX className="text-black dark:text-white" onClick={onClick} />
  ) : (
    <IconMenu2 className="text-black dark:text-white" onClick={onClick} />
  );
};

export const NavbarLogo = () => {
  return (
    <a
      href="#"
      style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        fontSize: "14px",
        fontWeight: "500",
        color: "rgba(255, 255, 255, 1)",
        textDecoration: "none",
        borderRadius: "9999px",
        transition: "background-color 0.2s ease",
        margin: 0,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <Image
        src="/logo.svg"
        alt="Kure-Cal logo"
        width={24}
        height={24}
        style={{ objectFit: "contain", borderRadius: 4 }}
      />
      <span style={{
        fontWeight: "500",
        color: "rgba(255, 255, 255, 1)",
        margin: 0,
        padding: 0,
        fontSize: "14px",
      }}>
        Kure-Cal
      </span>
    </a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const getVariantStyles = (variant: string) => {
    const styles: React.CSSProperties = {
      position: "relative",
      padding: "6px 12px",
      borderRadius: "9999px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "inline-block",
      textAlign: "center",
      whiteSpace: "nowrap",
      margin: 0,
      textDecoration: "none",
      border: "none",
    };

    switch (variant) {
      case "primary":
        return {
          ...styles,
          backgroundColor: "rgba(255, 255, 255, 1)",
          color: "rgba(0, 0, 0, 1)",
        };
      case "secondary":
        return {
          ...styles,
          backgroundColor: "transparent",
          color: "rgba(255, 255, 255, 0.9)",
        };
      case "dark":
        return {
          ...styles,
          backgroundColor: "rgba(0, 0, 0, 1)",
          color: "rgba(255, 255, 255, 1)",
        };
      default:
        return styles;
    }
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLElement>) => {
    if (variant === "primary") {
      e.currentTarget.style.backgroundColor = "rgba(245, 245, 245, 1)";
    } else if (variant === "secondary") {
      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
    }
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLElement>) => {
    if (variant === "primary") {
      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
    } else if (variant === "secondary") {
      e.currentTarget.style.backgroundColor = "transparent";
      e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
    }
  };

  return (
    <Tag
      href={href || undefined}
      style={getVariantStyles(variant)}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      {...props}
    >
      {children}
    </Tag>
  );
};
