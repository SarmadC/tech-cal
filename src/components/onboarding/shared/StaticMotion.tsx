import React from 'react';

type MotionProps<T> = T & {
    animate?: unknown;
    exit?: unknown;
    initial?: unknown;
    layout?: boolean;
    layoutId?: string;
    transition?: unknown;
    variants?: unknown;
    whileHover?: unknown;
    whileTap?: unknown;
};

function StaticDiv({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    layout: _layout,
    layoutId: _layoutId,
    transition: _transition,
    variants: _variants,
    whileHover: _whileHover,
    whileTap: _whileTap,
    children,
    ...props
}: MotionProps<React.HTMLAttributes<HTMLDivElement>>) {
    return <div {...props}>{children}</div>;
}

function StaticButton({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    layout: _layout,
    layoutId: _layoutId,
    transition: _transition,
    variants: _variants,
    whileHover: _whileHover,
    whileTap: _whileTap,
    children,
    type = 'button',
    ...props
}: MotionProps<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
    return <button type={type} {...props}>{children}</button>;
}

function StaticSpan({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    layout: _layout,
    layoutId: _layoutId,
    transition: _transition,
    variants: _variants,
    whileHover: _whileHover,
    whileTap: _whileTap,
    children,
    ...props
}: MotionProps<React.HTMLAttributes<HTMLSpanElement>>) {
    return <span {...props}>{children}</span>;
}

export const motion = {
    button: StaticButton,
    div: StaticDiv,
    span: StaticSpan
};

export function AnimatePresence({
    children
}: {
    children: React.ReactNode;
    mode?: 'popLayout' | 'sync' | 'wait';
}) {
    return <>{children}</>;
}
