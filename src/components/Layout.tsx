import React from 'react';
import {
    Users,
    Target,
    Banknote,
    RotateCcw,
    TrendingUp,
    Percent,
    Eye,
    ClipboardList,
    Wallet,
    Ellipsis,
    LogOut,
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

const navItems = [
    { icon: Target, label: 'Master List', short: 'Leads' },
    { icon: Users, label: 'Manage Team', short: 'Team' },
    { icon: Banknote, label: 'Receipts', short: 'Receipts' },
    { icon: Percent, label: 'Commission', short: 'Commission' },
    { icon: Eye, label: 'Monitoring', short: 'Monitoring' },
    { icon: ClipboardList, label: 'Daily Audit', short: 'Audit' },
    { icon: Wallet, label: 'Expenses', short: 'Expenses' },
    { icon: TrendingUp, label: 'Sales', short: 'Sales' },
];

// The phone tab bar shows the everyday tabs; everything else lives under "More".
const primaryLabels = ['Master List', 'Receipts', 'Commission', 'Sales'];
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

    // Switching page starts at the top and closes the More sheet.
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
            // `neq` on a never-matching id is the PostgREST way to say "all rows".
            const { error } = await supabase
                .from('leads')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
            setShowReset(false);
            setResetKey((k) => k + 1); // remount the current page so it reloads empty
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
                        <span className="lg:hidden text-sm font-extrabold tracking-tight text-ink shrink-0">WebNegosyo</span>
                        <span className="lg:hidden w-px h-5 bg-zinc-200 shrink-0" />
                        <h1 className="text-sm lg:text-xl font-black tracking-tighter text-black uppercase truncate">{activeTab}</h1>
                    </div>

                    <button
                        onClick={() => setMoreOpen(true)}
                        aria-haspopup="dialog"
                        aria-label="More"
                        className={cn(
                            "lg:hidden flex items-center gap-1.5 h-9 px-3 rounded-full border transition-colors active:scale-95 shrink-0",
                            moreActive ? "bg-ink text-white border-ink" : "bg-white text-ink border-zinc-200"
                        )}
                    >
                        <Ellipsis className="w-5 h-5" />
                        <span className="text-[10px] font-extrabold uppercase tracking-tight">More</span>
                    </button>

                    {isOwner && (
                        <button
                            onClick={openReset}
                            className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-all duration-300 font-medium active:scale-95 text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Reset</span>
                        </button>
                    )}
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
                        <h2 className="text-2xl font-black tracking-tighter text-black uppercase">Reset data</h2>
                        <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                            This permanently deletes every lead and deal, including payments and commissions. Team members, settings and client storage are kept. It cannot be undone.
                        </p>
                        <input
                            type="text"
                            value={resetConfirm}
                            onChange={(e) => setResetConfirm(e.target.value)}
                            placeholder="Type RESET to confirm"
                            className="w-full h-14 px-6 bg-zinc-50 border border-zinc-100 rounded-full focus:border-red-500 outline-none font-bold text-sm"
                        />
                        {resetMessage && <p className="text-[11px] font-black uppercase tracking-widest text-red-600">{resetMessage}</p>}
                        <div className="flex gap-3">
                            <button
                                disabled={isResetting}
                                onClick={() => setShowReset(false)}
                                className="flex-1 h-12 rounded-full border border-zinc-200 font-black uppercase tracking-widest text-[10px] text-zinc-500"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={resetConfirm !== 'RESET' || isResetting}
                                onClick={handleResetLeads}
                                className="flex-1 h-12 rounded-full bg-red-600 text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-40 active:scale-95 transition-all"
                            >
                                {isResetting ? 'Resetting...' : 'Reset data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile "More" bottom sheet */}
            <AnimatePresence>
                {moreOpen && (
                    <div className="lg:hidden fixed inset-0 z-[60]">
                        <motion.div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMoreOpen(false)}
                        />
                        <motion.div
                            role="dialog"
                            aria-label="More"
                            className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl max-h-[85dvh] overflow-y-auto"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.6 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 80 || info.velocity.y > 500) setMoreOpen(false);
                            }}
                        >
                            <div className="mx-auto w-10 h-1.5 rounded-full bg-zinc-200 mb-4" />

                            {profile && <div className="flex items-center gap-3 px-1 mb-4">{profileBadge}</div>}

                            <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-4 px-1 pt-1.5 pb-1.5">
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
