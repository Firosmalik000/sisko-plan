import { Form, Head, Link } from '@inertiajs/react';
import { Building2, Search } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import businessRoutes from '@/routes/super-admin/businesses';

type Business = {
    public_id: string;
    name: string;
    status: string;
    stores_count: number;
    members_count: number;
    created_at: string;
    subscription: { status: string; plan_name: string } | null;
};
type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number; links: PaginationLink[] };

export default function PlatformBusinesses({ businesses, filters }: { businesses: Paginated<Business>; filters: { search: string } }) {
    return (
        <>
            <Head title="Businesses" />
            <header className="platform-enter flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <p className="platform-kicker">Tenant management</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">Businesses</h1>
                    <p className="mt-1 text-xs font-medium text-slate-500">{businesses.total} businesses</p>
                </div>
                <Form action={businessRoutes.index.url()} method="get" className="flex w-full max-w-sm gap-2">
                    <Input name="search" defaultValue={filters.search} placeholder="Search businesses" className="bg-white/70" />
                    <Button variant="outline">
                        <Search /> Search
                    </Button>
                </Form>
            </header>
            <section className="platform-panel mt-5 overflow-hidden">
                <div className="divide-y divide-slate-900/8">
                    {businesses.data.map((business) => (
                        <Link
                            key={business.public_id}
                            href={businessRoutes.show.url(business.public_id)}
                            className="grid gap-3 p-4 transition hover:bg-[#fff7f3] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:px-5"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ff7a59]/20 text-[#9f2f19]">
                                    <Building2 className="size-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-bold">{business.name}</p>
                                    <p className="text-xs text-slate-500">{business.created_at}</p>
                                </div>
                            </div>
                            <p className="text-sm">
                                <strong>{business.stores_count}</strong> stores · <strong>{business.members_count}</strong> members
                            </p>
                            <p className="text-sm">{business.subscription?.plan_name ?? 'No plan'}</p>
                            <Badge variant={business.status === 'active' ? 'secondary' : 'destructive'}>{business.status}</Badge>
                        </Link>
                    ))}
                </div>
                {businesses.data.length === 0 && <p className="p-10 text-center text-sm text-slate-500">No business found.</p>}
                <div className="flex items-center justify-between border-t border-slate-900/8 px-5 py-4 text-xs text-slate-500">
                    <span>
                        Page {businesses.current_page} of {businesses.last_page}
                    </span>
                    <Pagination links={businesses.links} />
                </div>
            </section>
        </>
    );
}
