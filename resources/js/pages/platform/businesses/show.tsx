import { Form, Head } from '@inertiajs/react';
import { KeyRound, MonitorSmartphone, Power, Store, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import businessRoutes from '@/routes/super-admin/businesses';

type Member = { public_id: string; display_name: string; email: string | null; business_role: string; status: string };
type StoreItem = { public_id: string; name: string; status: string; country: { code: string; name: string } | null };
type Device = {
    public_id: string;
    name: string;
    status: string;
    last_seen_at: string | null;
    store: { public_id: string; name: string } | null;
};
type Business = {
    public_id: string;
    name: string;
    status: string;
    created_at: string;
    subscription: { public_id: string; status: string; plan_name: string } | null;
};

export default function BusinessShow({
    business,
    members,
    stores,
    devices,
    permissions,
}: {
    business: Business;
    members: Member[];
    stores: StoreItem[];
    devices: Device[];
    permissions: { status: boolean; devices: boolean; ownership: boolean };
}) {
    return (
        <>
            <Head title={business.name} />
            <header className="platform-enter flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="platform-kicker">Business tenant</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">{business.name}</h1>
                    <p className="mt-1 text-xs text-slate-500">
                        {business.subscription?.plan_name ?? 'No plan'} · {business.created_at}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={business.status === 'active' ? 'secondary' : 'destructive'}>{business.status}</Badge>
                    {permissions.status && business.status !== 'archived' && (
                        <Form {...businessRoutes.status.form(business.public_id)}>
                            <input type="hidden" name="status" value={business.status === 'active' ? 'suspended' : 'active'} />
                            <Button variant={business.status === 'active' ? 'destructive' : 'outline'}>
                                <Power />
                                {business.status === 'active' ? 'Suspend business' : 'Restore business'}
                            </Button>
                        </Form>
                    )}
                </div>
            </header>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <Panel icon={UsersRound} title="Members">
                    <div className="divide-y divide-slate-900/8">
                        {members.map((member) => (
                            <div key={member.public_id} className="flex min-h-16 items-center justify-between gap-3 py-2">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{member.display_name}</p>
                                    <p className="truncate text-xs text-slate-500">
                                        {member.email ?? 'POS device only'} · {member.business_role}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{member.status}</Badge>
                                    {permissions.ownership && member.business_role !== 'owner' && (
                                        <Form {...businessRoutes.ownership.recover.form(business.public_id)}>
                                            <input type="hidden" name="member_id" value={member.public_id} />
                                            <Button size="sm" variant="outline">
                                                <KeyRound />
                                                Make owner
                                            </Button>
                                        </Form>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel icon={Store} title="Stores">
                    <div className="divide-y divide-slate-900/8">
                        {stores.map((store) => (
                            <div key={store.public_id} className="flex min-h-16 items-center justify-between gap-3 py-2">
                                <div>
                                    <p className="font-semibold">{store.name}</p>
                                    <p className="text-xs text-slate-500">{store.country?.name ?? '-'}</p>
                                </div>
                                <Badge variant="outline">{store.status}</Badge>
                            </div>
                        ))}
                    </div>
                </Panel>
                <div className="xl:col-span-2">
                    <Panel icon={MonitorSmartphone} title="Cashier devices">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {devices.map((device) => (
                                <div key={device.public_id} className="rounded-xl border border-slate-900/10 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{device.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {device.store?.name ?? '-'} · {device.last_seen_at ?? 'Never seen'}
                                            </p>
                                        </div>
                                        <Badge variant="outline">{device.status}</Badge>
                                    </div>
                                    {permissions.devices && device.status === 'active' && (
                                        <Form
                                            {...businessRoutes.devices.revoke.form({
                                                business: business.public_id,
                                                device: device.public_id,
                                            })}
                                            className="mt-3"
                                        >
                                            <Button size="sm" variant="destructive">
                                                Revoke device
                                            </Button>
                                        </Form>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
}

function Panel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
    return (
        <section className="platform-panel p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-black">
                <Icon className="size-5 text-[#d83f22]" />
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}
