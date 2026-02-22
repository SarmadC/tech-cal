// Minimal layout for embed pages — no navbar/footer (handled via ClientLayout exclusion)
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
