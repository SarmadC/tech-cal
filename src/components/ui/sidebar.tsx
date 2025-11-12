'use client';

import React from 'react';

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
}

export function SidebarProvider({ defaultOpen = false, style, children, ...rest }: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const value = React.useMemo(() => ({
    open,
    setOpen,
    toggle: () => setOpen((v) => !v),
  }), [open]);

  return (
    <SidebarContext.Provider value={value}>
      <div
        style={{
          // CSS vars for width can be overridden by parent
          '--sidebar-width': '16rem',
          '--sidebar-width-mobile': '18rem',
          ...style,
        } as React.CSSProperties}
        {...rest}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  side?: 'left' | 'right';
}

export function Sidebar({ side: _side = 'left', className = '', style, children, ...rest }: SidebarProps) {
  const { open } = useSidebar();
  return (
    <aside
      className={`
        hidden md:flex flex-col bg-[oklch(var(--sidebar,0.205_0_0))]
        text-[oklch(var(--sidebar-foreground,0.985_0_0))]
        border-[color:oklch(var(--sidebar-border,1_0_0_/10%))]
        border-r overflow-hidden transition-[width] duration-200 ease-in-out
        fixed left-0 top-0 h-screen z-[60]
        ${className}
      `}
      style={{
        width: open ? 'var(--sidebar-width)' as unknown as number : '4rem' as unknown as number,
        minWidth: open ? 'var(--sidebar-width)' as unknown as number : '4rem' as unknown as number,
        ...style,
      }}
      {...rest}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-3 py-2 border-b border-[color:oklch(var(--sidebar-border,1_0_0_/10%))] ${className}`} {...rest} />
  );
}

export function SidebarFooter({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-auto px-3 py-2 border-t border-[color:oklch(var(--sidebar-border,1_0_0_/10%))] ${className}`} {...rest} />
  );
}

export function SidebarContent({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex-1 overflow-y-auto px-2 py-3 ${className}`} {...rest} />
  );
}

export function SidebarTrigger({ className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center justify-center rounded-md border border-border-default p-2 text-sm hover:bg-background-tertiary ${className}`}
      aria-label={open ? 'Close sidebar' : 'Open sidebar'}
      title={open ? 'Close sidebar' : 'Open sidebar'}
      {...rest}
    >
      {/* Hamburger / close icon using MaterialIcon */}
      <span className="sr-only">{open ? 'Close sidebar' : 'Open sidebar'}</span>
      {/* The app uses MaterialIcon elsewhere; keep consistent via data-icon attribute for now */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {open ? (
          // X icon
          <g>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </g>
        ) : (
          // Menu icon
          <g>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </g>
        )}
      </svg>
    </button>
  );
}

export function SidebarGroup({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-1 ${className}`} {...rest} />;
}

export function SidebarGroupLabel({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-2 py-2 text-xs uppercase tracking-wide text-foreground-tertiary ${className}`} {...rest} />;
}

export function SidebarGroupContent({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-1 ${className}`} {...rest} />;
}

export function SidebarMenu({ className = '', ...rest }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={`flex flex-col gap-1 ${className}`} {...rest} />;
}

export function SidebarMenuItem({ className = '', ...rest }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...rest} />;
}

export interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SidebarMenuButton({ className = '', children, asChild, ...rest }: SidebarMenuButtonProps) {
  const { open } = useSidebar();
  const baseClass = `w-full flex items-center ${open ? 'gap-3 justify-start' : 'justify-center'} rounded-md px-2 py-2 text-sm hover:bg-[oklch(var(--sidebar-accent,0.269_0_0))]`;

  if (asChild && React.isValidElement(children)) {
    const onlyChild = React.Children.only(children) as React.ReactElement<{ className?: string }>;
    const mergedClassName = `${baseClass} ${onlyChild.props.className || ''} ${className}`.trim();
    return React.cloneElement(onlyChild, { className: mergedClassName });
  }

  return (
    <button
      className={`${baseClass} ${className}`}
      {...rest}
    >
      {children}
      {!open ? null : null}
    </button>
  );
}


