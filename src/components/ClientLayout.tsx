'use client';

import { usePathname } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCalendarPage = pathname === '/calendar';

  // For calendar page, render children directly without navbar/footer
  if (isCalendarPage) {
    return <>{children}</>;
  }

  // For all other pages, include navbar and footer
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}