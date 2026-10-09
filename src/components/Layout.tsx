import React from 'react';
import {
    Users,
    Target,
    Banknote,
    Menu,
    X,
    RotateCcw,
    TrendingUp,
    Percent,
    Eye,
    ClipboardList,
    Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
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

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const { profile, isOwner, signOut } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);
    const [showReset, setShowReset] = React.useState(false);
    const [resetConfirm, setResetConfirm] = React.useState('');
    const [isResetting, setIsResetting] = React.useState(false);
    const [resetMessage, setResetMessage] = React.useState<string | null>(null);
    const [resetKey, setResetKey] = React.useState(0);

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

    const navItems = [
        { icon: Target, label: 'Master List' },
        { icon: Users, label: 'Manage Team' },
        { icon: Banknote, label: 'Receipts' },
        { icon: Percent, label: 'Commission' },
        { icon: Eye, label: 'Monitoring' },
        { icon: ClipboardList, label: 'Daily Audit' },
        { icon: Wallet, label: 'Expenses' },
        { icon: TrendingUp, label: 'Sales' },
    ];

    return (
        <div className="flex h-dvh text-foreground overflow-hidden">
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[45] lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:static top-0 left-0 z-50 h-dvh w-72 max-w-[85vw] shrink-0 bg-white border-r border-zinc-100 p-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-sm overflow-y-auto",
                !isOpen && "-translate-x-full"
            )}>
                <div className="flex flex-col items-center mb-6 px-2 text-center">
                    <div className="mb-2 min-h-[2.5rem] flex flex-col items-center justify-center">
                        <LogoMark className="h-10 w-auto" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-sm tracking-tight text-ink">WebNegosyo</h2>
                        <p className="text-[7px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-0.5">Management Suite</p>
                    </div>
                    <button
                        className="lg:hidden absolute top-8 right-8 p-2 hover:bg-zinc-50 rounded-full transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.label}
                            {...item}
                            isActive={activeTab === item.label}
                            onClick={() => {
                                setActiveTab(item.label);
                                setIsOpen(false);
                            }}
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
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-black text-black overflow-hidden">
                                {profile.photo_url ? (
                                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    profile.name?.charAt(0) || 'U'
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black truncate text-black uppercase tracking-tight">{profile.name || 'User'}</p>
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{isOwner ? 'Owner' : 'Employee'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
                <header className="h-[calc(4.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] lg:h-16 lg:pt-0 px-4 sm:px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-white/70 backdrop-blur-2xl z-30 border-b border-zinc-200/60">
                    <div className="flex items-center gap-4 lg:gap-6">
                        <button
                            className="lg:hidden p-2.5 hover:bg-zinc-100 rounded-full transition-colors"
                            onClick={() => setIsOpen(true)}
                        >
                            <Menu className="w-5 h-5 lg:w-6 lg:h-6" />
                        </button>
                        <div>
                            <h1 className="text-base lg:text-xl font-black tracking-tighter text-black uppercase">{activeTab}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {isOwner && (
                            <button
                                onClick={() => { setResetConfirm(''); setResetMessage(null); setShowReset(true); }}
                                className="flex items-center gap-2 px-4 lg:px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-all duration-300 font-medium active:scale-95 text-xs lg:text-sm"
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

            {/* Mobile bottom tab bar */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-2xl border-t border-zinc-200 pb-safe">
                <div className="flex items-stretch justify-around px-2 pt-1.5 pb-1.5">
                    {navItems.map(({ icon: Icon, label }) => {
                        const active = activeTab === label;
                        return (
                            <button
                                key={label}
                                onClick={() => setActiveTab(label)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors",
                                    active ? "text-ink" : "text-zinc-400"
                                )}
                            >
                                <span className={cn("px-4 py-1 rounded-full transition-colors", active && "bg-ink text-white")}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider">{label === 'Master List' ? 'Leads' : label === 'Manage Team' ? 'Team' : label}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl text-zinc-400"
                    >
                        <span className="px-4 py-1"><Menu className="w-5 h-5" /></span>
                        <span className="text-[9px] font-black uppercase tracking-wider">More</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
