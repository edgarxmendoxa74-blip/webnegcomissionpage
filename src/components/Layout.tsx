import React from 'react';
import {
    Users,
    Target,
    Banknote,
    Settings,
    Menu,
    X,
    PlusCircle,
    TrendingUp,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

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
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
    const [logoError, setLogoError] = React.useState(false);

    React.useEffect(() => {
        const fetchLogo = async () => {
            const { data } = await supabase.from('app_settings').select('logo_url').eq('id', 1).single();
            if (data?.logo_url) {
                setLogoUrl(data.logo_url);
                setLogoError(false);
            }
        };
        fetchLogo();

        const channel = supabase
            .channel('app_settings_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1' },
                (payload) => {
                    if (payload.new.logo_url) {
                        setLogoUrl(payload.new.logo_url);
                        setLogoError(false);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const navItems = [
        { icon: Target, label: 'Master List' },
        { icon: Users, label: 'Manage Team' },
        { icon: Banknote, label: 'Receipts' },
        { icon: TrendingUp, label: 'Sales' },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-zinc-100 p-8 flex flex-col transition-transform duration-500 lg:translate-x-0 shadow-sm overflow-y-auto",
                !isOpen && "-translate-x-full"
            )}>
                <div className="flex flex-col items-center mb-12 px-2 text-center">
                    <div className="mb-4 min-h-[4rem] flex flex-col items-center justify-center">
                        {!logoError && (
                            <img
                                src={logoUrl || "/vite.svg"}
                                alt="WebNegosyo"
                                className="w-16 h-16 object-contain grayscale hover:grayscale-0 transition-all duration-500"
                                onError={() => setLogoError(true)}
                            />
                        )}
                    </div>
                    <div>
                        <h2 className="font-extrabold text-2xl tracking-tight text-black flex items-center gap-1">
                            WEB<span className="font-light text-zinc-400">NEGOSYO</span>
                        </h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Management Suite</p>
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
                    {isOwner && (
                        <button
                            onClick={() => setActiveTab('Settings')}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 w-full group",
                                activeTab === 'Settings' ? "bg-black text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}>
                            <Settings className={cn("w-5 h-5 transition-transform", activeTab === 'Settings' ? "rotate-45" : "group-hover:rotate-45")} />
                            <span className="font-medium">Settings</span>
                        </button>
                    )}

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
            <main className="flex-1 min-w-0 overflow-auto bg-[#fafafa]">
                <header className="h-24 px-12 flex items-center justify-between sticky top-0 bg-white/60 backdrop-blur-2xl z-30 border-b border-zinc-100/50">
                    <div className="flex items-center gap-6">
                        <button
                            className="lg:hidden p-3 hover:bg-zinc-100 rounded-full transition-colors"
                            onClick={() => setIsOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-black uppercase italic">{activeTab}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 font-medium active:scale-95">
                            <PlusCircle className="w-4 h-4" />
                            <span>Add Record</span>
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
