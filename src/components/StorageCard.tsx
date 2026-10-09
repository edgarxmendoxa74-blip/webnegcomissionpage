import React, { useState } from 'react';
import {
    Globe,
    Shield,
    Key,
    Eye,
    EyeOff,
    Copy,
    Check,
    ChevronDown,
    Database,
    Mail,
    UserCog,
    Calendar,
} from 'lucide-react';

export interface StorageItem {
    id: string;
    client_name: string;
    business_name: string | null;
    website_link?: string | null;
    admin_link?: string | null;
    admin_email?: string | null;
    admin_password?: string | null;
    supabase_email?: string | null;
    supabase_password?: string | null;
    database_password?: string | null;
    created_at: string;
    worker?: { name: string };
    assigned_webdev?: { name: string };
}

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    };
    return (
        <button
            type="button"
            title="Copy"
            onClick={copy}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-black hover:bg-white transition-all"
        >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
    );
};

const Field: React.FC<{
    label: string;
    value?: string | null;
    secret?: boolean;
    icon: React.ReactNode;
}> = ({ label, value, secret, icon }) => {
    const [visible, setVisible] = useState(false);
    if (!value) return null;
    return (
        <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-2.5 py-1.5 border border-zinc-100/80">
            <div className="text-zinc-300 shrink-0">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[7px] font-black text-zinc-400 uppercase tracking-[0.2em]">{label}</p>
                <p className="text-[10px] font-bold text-black font-mono truncate">
                    {secret && !visible ? '**********' : value}
                </p>
            </div>
            {secret && (
                <button
                    type="button"
                    title={visible ? 'Hide' : 'Show'}
                    onClick={() => setVisible(v => !v)}
                    className="p-1.5 rounded-lg text-zinc-300 hover:text-black hover:bg-white transition-all"
                >
                    {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
            )}
            <CopyButton value={value} />
        </div>
    );
};

const LinkPill: React.FC<{ href: string; label: string; icon: React.ReactNode }> = ({ href, label, icon }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 hover:bg-black hover:text-white hover:border-black transition-all text-[9px] font-black uppercase tracking-widest"
    >
        {icon}
        {label}
    </a>
);

interface Props {
    item: StorageItem;
    showCreator?: boolean;
    actions?: React.ReactNode;
}

export const StorageCard: React.FC<Props> = ({ item, showCreator, actions }) => {
    const [open, setOpen] = useState(false);
    const hasCreds = !!(
        item.admin_email || item.admin_password ||
        item.supabase_email || item.supabase_password || item.database_password
    );
    const webdev = item.assigned_webdev?.name;

    return (
        <div className="group bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
            <div className="p-3.5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm shrink-0">
                    {item.client_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-black truncate">{item.client_name}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate mt-0.5">
                        {item.business_name || 'No business name'}
                    </p>
                </div>
                {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
            </div>

            <div className="px-3.5 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${webdev ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    <UserCog className="w-3 h-3" />
                    {webdev || 'Unassigned'}
                </span>
                {showCreator && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-zinc-50 text-zinc-500 border border-zinc-100">
                        By {item.worker?.name || 'Unknown'}
                    </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-zinc-300">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
            </div>

            {(item.website_link || item.admin_link) && (
                <div className="px-3.5 pt-3 flex flex-wrap gap-2">
                    {item.website_link && <LinkPill href={item.website_link} label="Website" icon={<Globe className="w-3.5 h-3.5" />} />}
                    {item.admin_link && <LinkPill href={item.admin_link} label="Admin" icon={<Shield className="w-3.5 h-3.5" />} />}
                </div>
            )}

            <div className="mt-auto pt-3">
                {hasCreds && (
                    <>
                        <button
                            type="button"
                            onClick={() => setOpen(o => !o)}
                            className="w-full flex items-center justify-between px-3.5 py-2 border-t border-zinc-50 bg-zinc-50/50 hover:bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-all"
                        >
                            <span className="flex items-center gap-2"><Key className="w-3.5 h-3.5" /> Credentials</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                            <div className="p-3 space-y-1.5 border-t border-zinc-50">
                                <Field label="Admin Email" value={item.admin_email} icon={<Mail className="w-3.5 h-3.5" />} />
                                <Field label="Admin Password" value={item.admin_password} secret icon={<Key className="w-3.5 h-3.5" />} />
                                <Field label="Supabase Email" value={item.supabase_email} icon={<Mail className="w-3.5 h-3.5" />} />
                                <Field label="Supabase Password" value={item.supabase_password} secret icon={<Key className="w-3.5 h-3.5" />} />
                                <Field label="Database Password" value={item.database_password} secret icon={<Database className="w-3.5 h-3.5" />} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
