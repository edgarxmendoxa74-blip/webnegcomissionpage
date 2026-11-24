import React from 'react';
import {
    Users,
    Target,
    Banknote,
    RotateCcw,
    TrendingUp,
    Eye,
    ClipboardList,
    Wallet,
    Menu,
    LogOut,
    UserCheck,
    Video,
    Bell,
    X,
    UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogoMark } from './Logo';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick: () => void;
}

const NavItem = ({ icon: Icon, label, isActive, onClick }: NavItemProps) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-500 w-full group relative overflow-hidden",
            isActive
                ? "bg-black text-white shadow-xl shadow-black/10 scale-[1.02]"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-black"
        )}
    >
        <Icon className={cn("w-5 h-5 transition-all duration-500", isActive ? "text-white" : "group-hover:scale-110 group-hover:text-black")} />
        <span className="font-semibold tracking-tight">{label}</span>
        {isActive && (
            <motion.div
                layoutId="active-pill"
                className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40"
            />
        )}
    </button>
);

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

interface AppNotification {
    id: string;
    name: string;
    time: Date;
    read: boolean;
}

const navItems = [
    { icon: Target, label: 'Master List', short: 'Leads' },
    { icon: Users, label: 'Manage Team', short: 'Team' },
    { icon: UserCheck, label: 'Applicants', short: 'Hiring' },
    { icon: Video, label: 'Training Videos', short: 'Videos' },
    { icon: Banknote, label: 'Receipts', short: 'Receipts' },
    { icon: ClipboardList, label: 'Daily Audit', short: 'Audit' },
    { icon: Eye, label: 'Monitoring', short: 'Monitoring' },
    { icon: Wallet, label: 'Expenses', short: 'Expenses' },
    { icon: TrendingUp, label: 'Sales', short: 'Sales' },
];

const primaryLabels = ['Master List', 'Receipts', 'Daily Audit'];
const primaryItems = navItems.filter((n) => primaryLabels.includes(n.label));
const moreItems = navItems.filter((n) => !primaryLabels.includes(n.label));

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const { profile, isOwner, signOut } = useAuth();
    const [moreOpen, setMoreOpen] = React.useState(false);
    const [showReset, setShowReset] = React.useState(false);
    const [resetConfirm, setResetConfirm] = React.useState('');
    const [isResetting, setIsResetting] = React.useState(false);
    const [resetMessage, setResetMessage] = React.useState<string | null>(null);
    const [resetKey, setResetKey] = React.useState(0);
    const mainRef = React.useRef<HTMLElement>(null);

    // ── Notification permission + SW message ───────────────────────────────
    const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | null>(null);

    // Request permission once when owner loads the app
    React.useEffect(() => {
        if (!isOwner) return;
        if (!('Notification' in window)) return;

        setNotifPermission(Notification.permission);

        if (Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                setNotifPermission(perm);
            });
        }
    }, [isOwner]);

    // Send message to SW to fire a native OS notification
    const fireNativeNotification = React.useCallback((name: string) => {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.ready.then(reg => {
            reg.active?.postMessage({ type: 'NEW_APPLICANT', name });
        });
    }, []);

    // Listen for SW → app messages (e.g. notificationclick navigate)
    React.useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'NAVIGATE_TO' && event.data.tab) {
                setActiveTab(event.data.tab);
            }
        };
        navigator.serviceWorker.addEventListener('message', handler);
        return () => navigator.serviceWorker.removeEventListener('message', handler);
    }, [setActiveTab]);

    // ── Notification state ──────────────────────────────────────────────────
    const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
    const [notifOpen, setNotifOpen] = React.useState(false);
    const notifRef = React.useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => !n.read).length;

    // Subscribe to new applicants (owner only)
    React.useEffect(() => {
        if (!isOwner) return;

        const channel = supabase
            .channel('layout-applicants-notif')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'applicants' },
                (payload) => {
                    const name = (payload.new as any)?.full_name || 'Someone';
                    setNotifications(prev => [
                        {
                            id: (payload.new as any)?.id || String(Date.now()),
                            name,
                            time: new Date(),
                            read: false,
                        },
                        ...prev,
                    ]);
                    fireNativeNotification(name);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isOwner]);

    // Close notif panel when clicking outside
    React.useEffect(() => {
        if (!notifOpen) return;
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [notifOpen]);

    const openNotif = () => {
        setNotifOpen(o => !o);
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
        setNotifOpen(false);
    };

    const timeAgo = (date: Date) => {
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    // ── Other layout state ──────────────────────────────────────────────────
    React.useEffect(() => {
        mainRef.current?.scrollTo({ top: 0 });
        setMoreOpen(false);
    }, [activeTab]);

    React.useEffect(() => {
        if (!moreOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [moreOpen]);

    const moreActive = moreItems.some((n) => n.label === activeTab);

    const openReset = () => {
        setMoreOpen(false);
        setResetConfirm('');
        setResetMessage(null);
        setShowReset(true);
    };

    const handleResetLeads = async () => {
        if (resetConfirm !== 'RESET') return;
        setIsResetting(true);
        setResetMessage(null);
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
            setShowReset(false);
            setResetKey((k) => k + 1);
        } catch (err: any) {
            setResetMessage(err?.message || 'Reset failed. Make sure you are signed in as the owner.');
        } finally {
            setIsResetting(false);
        }
    };

    const profileBadge = profile && (
        <>
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-black text-black overflow-hidden shrink-0">
                {profile.photo_url ? (
                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                ) : isOwner ? (
                    <LogoMark className="w-6 h-6 object-contain" />
                ) : (
                    profile.name?.charAt(0) || 'U'
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate text-black uppercase tracking-tight">{profile.name || 'User'}</p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{isOwner ? 'Owner' : 'Employee'}</p>
            </div>
        </>
    );

    return (
        <div className="flex h-dvh text-foreground overflow-hidden">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex h-dvh w-72 shrink-0 bg-white border-r border-zinc-100 p-8 flex-col shadow-sm overflow-y-auto">
                <div className="flex flex-col items-center mb-6 px-2 text-center">
                    <div className="mb-2 min-h-[2.5rem] flex flex-col items-center justify-center">
                        <LogoMark className="h-10 w-auto" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-sm tracking-tight text-ink">WebNegosyo</h2>
                        <p className="text-[7px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-0.5">Management Suite</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeTab === item.label}
                            onClick={() => setActiveTab(item.label)}
                        />
                    ))}
                </nav>

                <div className="mt-auto space-y-2 pt-8">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 w-full text-red-500 hover:bg-red-50 hover:text-red-600 group"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="font-medium">Logout</span>
                    </button>

                    {profile && (
                        <div className="pt-4 border-t border-zinc-100 mt-4 flex items-center gap-3 px-2">
                            {profileBadge}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
                <header className="h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] lg:h-16 lg:pt-0 px-4 sm:px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-2xl z-30 border-b border-zinc-200/60">
                    <div className="flex items-center gap-3 min-w-0">
                        <LogoMark className="lg:hidden h-6 w-auto shrink-0" />
                        <span className="lg:hidden w-px h-5 bg-zinc-200 shrink-0" />
                        <h1 className="text-sm lg:text-xl font-black tracking-tighter text-black uppercase truncate">{activeTab}</h1>
                    </div>

                    {/* Right side of header */}
                    <div className="flex items-center gap-2 shrink-0">

                        {/* Notification bell — owner only */}
                        {isOwner && (
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={openNotif}
                                    aria-label="Notifications"
                                    className={cn(
                                        "relative flex items-center justify-center w-9 h-9 rounded-xl border transition-colors active:scale-95",
                                        notifOpen
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                                    )}
                                >
                                    <Bell className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black px-0.5 ring-2 ring-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                    {/* Muted indicator when permission denied */}
                                    {notifPermission === 'denied' && (
                                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center">
                                            <X className="w-1.5 h-1.5 text-white" />
                                        </span>
                                    )}
                                </button>

                                {/* Notification dropdown panel */}
                                <AnimatePresence>
                                    {notifOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                                            className="absolute right-0 top-[calc(100%+0.5rem)] w-80 bg-white rounded-2xl border border-zinc-200 shadow-2xl z-50 overflow-hidden"
                                        >
                                            {/* Panel header */}
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="w-4 h-4 text-zinc-700" />
                                                    <span className="text-sm font-black text-black uppercase tracking-tight">Notifications</span>
                                                    {unreadCount > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black">
                                                            {unreadCount} new
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {unreadCount > 0 && (
                                                        <button
                                                            onClick={markAllRead}
                                                            className="text-[10px] font-bold text-zinc-400 hover:text-black px-2 py-1 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                                                        >
                                                            Mark all read
                                                        </button>
                                                    )}
                                                    {notifications.length > 0 && (
                                                        <button
                                                            onClick={clearAll}
                                                            className="text-[10px] font-bold text-zinc-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Permission status banner */}
                                            {notifPermission !== 'granted' && (
                                                <div className={cn(
                                                    "flex items-center justify-between gap-2 px-4 py-2.5 text-xs border-b",
                                                    notifPermission === 'denied'
                                                        ? "bg-red-50 border-red-100"
                                                        : "bg-amber-50 border-amber-100"
                                                )}>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={notifPermission === 'denied' ? "text-red-500" : "text-amber-500"}>
                                                            {notifPermission === 'denied' ? '🔕' : '🔔'}
                                                        </span>
                                                        <span className={cn("font-semibold leading-tight", notifPermission === 'denied' ? "text-red-700" : "text-amber-700")}>
                                                            {notifPermission === 'denied'
                                                                ? 'Notifications blocked. Enable in browser settings.'
                                                                : 'Allow notifications to get alerts on your device.'
                                                            }
                                                        </span>
                                                    </div>
                                                    {notifPermission !== 'denied' && (
                                                        <button
                                                            onClick={() => {
                                                                Notification.requestPermission().then(p => setNotifPermission(p));
                                                            }}
                                                            className="shrink-0 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                                                        >
                                                            Allow
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Notification list */}
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-300">
                                                        <Bell className="w-8 h-8" />
                                                        <p className="text-xs font-bold text-zinc-400">No notifications yet</p>
                                                        <p className="text-[10px] text-zinc-300">New applicants will appear here</p>
                                                    </div>
                                                ) : (
                                                    <ul className="divide-y divide-zinc-50">
                                                        {notifications.map(notif => (
                                                            <li
                                                                key={notif.id}
                                                                onClick={() => {
                                                                    setNotifications(prev =>
                                                                        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                                                                    );
                                                                    setActiveTab('Applicants');
                                                                    setNotifOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-50",
                                                                    !notif.read && "bg-emerald-50/60"
                                                                )}
                                                            >
                                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <UserPlus className="w-4 h-4 text-emerald-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black text-black truncate">{notif.name}</p>
                                                                    <p className="text-[10px] text-zinc-500 font-medium">Applied via hiring portal</p>
                                                                    <p className="text-[9px] text-zinc-400 font-medium mt-0.5">{timeAgo(notif.time)}</p>
                                                                </div>
                                                                {!notif.read && (
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Footer — go to applicants */}
                                            {notifications.length > 0 && (
                                                <div className="border-t border-zinc-100 p-2">
                                                    <button
                                                        onClick={() => {
                                                            markAllRead();
                                                            setActiveTab('Applicants');
                                                            setNotifOpen(false);
                                                        }}
                                                        className="w-full py-2 text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer"
                                                    >
                                                        View all applicants →
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMoreOpen(true)}
                            aria-haspopup="dialog"
                            aria-label="Menu"
                            className={cn(
                                "lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors active:scale-95",
                                moreActive ? "bg-black text-white border-black" : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                            )}
                        >
                            <Menu className="w-4 h-4" />
                            <span>Menu</span>
                        </button>

                        {/* Desktop reset button */}
                        {isOwner && (
                            <button
                                onClick={openReset}
                                className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-all duration-300 font-medium active:scale-95 text-sm"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </header>

                <div key={resetKey} className="p-4 sm:p-6 lg:p-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8">
                    {children}
                </div>
            </main>

            {/* Reset data confirmation */}
            {showReset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isResetting && setShowReset(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-5">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                                <RotateCcw className="w-8 h-8 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">Irreversible Action</p>
                                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">Are you sure?</h2>
                            </div>
                        </div>

                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1.5">
                            <p className="text-xs font-black uppercase tracking-wider text-red-700">This will permanently delete:</p>
                            <ul className="space-y-1">
                                {['All leads & deals', 'All payments & commissions', 'All sales history'].map(item => (
                                    <li key={item} className="flex items-center gap-2 text-xs font-medium text-red-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-[10px] font-bold text-red-400 pt-1">Team members, settings and client storage are kept.</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-zinc-500 text-center">Type <span className="font-black text-black">RESET</span> to confirm</p>
                            <input
                                type="text"
                                value={resetConfirm}
                                onChange={(e) => setResetConfirm(e.target.value)}
                                placeholder="Type RESET here..."
                                className="w-full h-14 px-6 bg-zinc-50 border border-zinc-200 rounded-full focus:border-red-500 outline-none font-bold text-sm text-center tracking-widest"
                            />
                        </div>

                        {resetMessage && (
                            <p className="text-[11px] font-black uppercase tracking-widest text-red-600 text-center">{resetMessage}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                disabled={isResetting}
                                onClick={() => setShowReset(false)}
                                className="flex-1 h-12 rounded-full border border-zinc-200 hover:bg-zinc-50 font-black uppercase tracking-widest text-[10px] text-zinc-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={resetConfirm !== 'RESET' || isResetting}
                                onClick={handleResetLeads}
                                className="flex-1 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-40 active:scale-95 transition-all"
                            >
                                {isResetting ? 'Resetting...' : 'Yes, Reset All Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile "More" popover */}
            <AnimatePresence>
                {moreOpen && (
                    <div className="lg:hidden fixed inset-0 z-[60]">
                        <motion.div
                            className="absolute inset-0 bg-black/30"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMoreOpen(false)}
                        />
                        <motion.div
                            role="dialog"
                            aria-label="More"
                            className="absolute right-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] w-[min(20rem,calc(100vw-1.5rem))] origin-top-right bg-white rounded-3xl p-4 shadow-2xl border border-zinc-100 max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] overflow-y-auto"
                            initial={{ opacity: 0, scale: 0.92, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -8 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        >
                            {profile && <div className="flex items-center gap-3 px-1 mb-4">{profileBadge}</div>}

                            <div className="grid grid-cols-1 gap-2">
                                {moreItems.map(({ icon: Icon, label }) => {
                                    const active = activeTab === label;
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => setActiveTab(label)}
                                            aria-current={active ? 'page' : undefined}
                                            className={cn(
                                                "flex items-center gap-3 px-4 min-h-14 rounded-2xl text-left transition-all active:scale-[0.97]",
                                                active ? "bg-black text-white" : "bg-zinc-50 text-black"
                                            )}
                                        >
                                            <Icon className="w-5 h-5 shrink-0" />
                                            <span className="text-xs font-black uppercase tracking-tight leading-tight">{label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-4 pt-4 border-t border-zinc-100 grid gap-2">
                                {isOwner && (
                                    <button
                                        onClick={openReset}
                                        className="flex items-center gap-3 px-4 min-h-12 rounded-2xl text-red-600 active:bg-red-50"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        <span className="text-sm font-bold">Reset data</span>
                                    </button>
                                )}
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-3 px-4 min-h-12 rounded-2xl text-red-500 active:bg-red-50"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm font-bold">Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile bottom tab bar */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-zinc-200 pb-safe" aria-label="Main">
                <div className="grid grid-cols-3 px-1 pt-1.5 pb-1.5">
                    {primaryItems.map(({ icon: Icon, short, label }) => {
                        const active = activeTab === label;
                        return (
                            <button
                                key={label}
                                onClick={() => setActiveTab(label)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    "flex flex-col items-center gap-1 py-1.5 min-w-0 transition-colors active:scale-95",
                                    active ? "text-ink" : "text-zinc-400"
                                )}
                            >
                                <span className={cn("px-5 py-1 rounded-full transition-colors", active && "bg-ink text-white")}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                <span className="text-[10px] font-extrabold tracking-tight truncate max-w-full px-0.5">{short}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
