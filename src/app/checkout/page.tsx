import { redirect } from 'next/navigation';

export default function CheckoutRedirectPage({
    searchParams
}: {
    searchParams?: { plan?: string };
}) {
    const plan = searchParams?.plan === 'annual' ? 'annual' : 'monthly';
    redirect(`/pricing?checkout=${plan}`);
}
