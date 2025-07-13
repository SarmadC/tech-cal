// src/app/calendar/layout.tsx
export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}