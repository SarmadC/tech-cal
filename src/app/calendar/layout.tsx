// src/app/calendar/layout.tsx
export default function CalendarLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    // Simple pass-through layout for calendar routes
    // The actual calendar layout logic is handled in CalendarClientView
    return <>{children}</>;
}