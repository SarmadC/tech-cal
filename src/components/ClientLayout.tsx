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
  // Define paths that should use their own layout (no default Navbar/Footer)
  const excludedPaths = ['/calendar', '/'];

  // If the current path is in the excluded list, render children directly.
  if (excludedPaths.includes(pathname)) {
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