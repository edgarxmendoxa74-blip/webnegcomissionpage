import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertCircle, Loader2, User, Eye, EyeOff, CheckCircle, PartyPopper, ArrowLeft, Check, Fingerprint } from 'lucide-react';
import { LogoMark } from '../components/Logo';
import { authenticateWithBiometrics, isBiometricsAvailable } from '../lib/biometrics';

const OWNER_EMAIL = 'owner@webnegosyo.com';
const REMEMBER_KEY = 'webnegosyo.remember';

// Only the username (never the password) is kept in localStorage. The password itself is
// saved by the browser's own password manager, which is triggered by the autocomplete
// attributes on the form and by the Credential Management API below.
const readRemembered = (): { remember: boolean; username: string } => {
    try {
        const raw = localStorage.getItem(REMEMBER_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { remember: true, username: typeof parsed.username === 'string' ? parsed.username : '' };
        }
    } catch { /* storage unavailable */ }
    return { remember: false, username: '' };
};

const persistRemembered = (remember: boolean, username: string) => {
    try {
        if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username }));
        else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* storage unavailable */ }
};

const offerToSavePassword = async (id: string, password: string) => {
    try {
        const PasswordCredentialCtor = (window as any).PasswordCredential;
        if (PasswordCredentialCtor && navigator.credentials?.store) {
            await navigator.credentials.store(new PasswordCredentialCtor({ id, password, name: id }));
        }
    } catch { /* unsupported or declined */ }
};

export const LoginPage: React.FC = () => {
    const [portal, setPortal] = useState<'selection' | 'owner' | 'employee'>('selection');
    const [isRegistering, setIsRegistering] = useState(false);
    const [remembered] = useState(readRemembered);
    const [rememberMe, setRememberMe] = useState(remembered.remember);
    const [username, setUsername] = useState(remembered.username);
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [gcash, setGcash] = useState('');
    const [loading, setLoading] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleBiometricLogin = async () => {
        setError(null);
        setBiometricLoading(true);
        try {
            const isAvail = await isBiometricsAvailable();
            if (!isAvail) {
                setError('Biometric sensor / fingerprint is not available on this browser/device.');
                return;
            }

            const targetUser = username.trim() || undefined;
            await authenticateWithBiometrics(targetUser);
            // Supabase session restored via authenticateWithBiometrics, AuthContext listener will handle redirect
        } catch (err: any) {
            setError(err?.message || 'Fingerprint sign in failed');
        } finally {
            setBiometricLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (portal === 'owner') {
                const ownerEmail = OWNER_EMAIL;
                
                // Try to sign in the owner
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: ownerEmail,
                    password
                });

                if (signInError) {
                    // Check if an owner already exists in the workers table
                    const { data: owners, error: checkError } = await supabase
                        .from('workers')
                        .select('id')
                        .eq('is_owner', true)
                        .limit(1);

                    if (!checkError && (!owners || owners.length === 0)) {
                        // If no owner exists, auto-register this password as the new owner account!
                        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                            email: ownerEmail,
                            password
                        });

                        if (signUpError) throw signUpError;
                        if (!signUpData.user) throw new Error('Failed to create owner user');

                        const { error: profileError } = await supabase.from('workers').insert({
                            name: 'Owner',
                            email: ownerEmail,
                            user_id: signUpData.user.id,
                            role: 'Owner',
                            is_owner: true,
                            active: true
                        });

                        if (profileError) throw profileError;

                        // Sign in to establish the session
                        const { error: finalSignInError } = await supabase.auth.signInWithPassword({
                            email: ownerEmail,
                            password
                        });
                        if (finalSignInError) throw finalSignInError;
                    } else {
                        // Owner exists, but password was incorrect
                        throw new Error('Incorrect Owner Password');
                    }
                }
            } else {
                // Employee login
                const internalEmail = `${username.trim().toLowerCase()}@webnegosyo.internal`;
                const { error } = await supabase.auth.signInWithPassword({
                    email: internalEmail,
                    password
                });
                if (error) throw error;
            }

            const savedId = portal === 'owner' ? OWNER_EMAIL : username.trim();
            persistRemembered(rememberMe, portal === 'owner' ? '' : savedId);
            if (rememberMe) void offerToSavePassword(savedId, password);
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.toLowerCase().includes('rate limit')) {
                setError('Email rate limit exceeded by Supabase. Please wait 2-5 minutes before trying again, or disable "Confirm Email" in your Supabase Auth settings.');
            } else {
                setError(msg || 'Failed to sign in');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true });
            const isFirstUser = count === 0;

            const internalEmail = `${username.trim().toLowerCase()}@webnegosyo.internal`;
            
            // Check if a worker profile with this email already exists (pre-seeded/created by admin)
            const { data: existingWorker } = await supabase
                .from('workers')
                .select('*')
                .eq('email', internalEmail)
                .maybeSingle();

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: internalEmail,
                password
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create user');

            let profileError;
            if (existingWorker) {
                // Link the newly registered user to their existing worker profile
                const { error } = await supabase
                    .from('workers')
                    .update({
                        user_id: authData.user.id,
                        gcash_number: gcash || existingWorker.gcash_number,
                        name: name || existingWorker.name
                    })
                    .eq('id', existingWorker.id);
                profileError = error;
            } else {
                // Create a brand new worker profile
                const { error } = await supabase.from('workers').insert({
                    name,
                    email: internalEmail,
                    gcash_number: gcash,
                    user_id: authData.user.id,
                    role: isFirstUser ? 'Owner' : 'Agent',
                    is_owner: isFirstUser
                });
                profileError = error;
            }
            
            if (profileError) throw profileError;

            setShowSuccessModal(true);
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.toLowerCase().includes('rate limit')) {
                setError('Email rate limit exceeded by Supabase. Please wait 2-5 minutes before trying again, or disable "Confirm Email" in your Supabase Auth settings.');
            } else {
                setError(msg || 'Failed to register');
            }
        } finally {
            setLoading(false);
        }
    };

    if (portal === 'selection') {
        return (
            <div className="min-h-dvh flex items-center justify-center p-6">
                <div className="w-full max-w-4xl">
                    <div className="flex flex-col items-center text-center mb-8 sm:mb-14">
                        <LogoMark className="h-16 sm:h-24 w-auto text-ink mb-4 sm:mb-6" />
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink mb-3">WebNegosyo</h1>
                        <p className="text-zinc-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Management for Commissions</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                        <motion.button
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPortal('owner')}
                            className="bg-ink p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-center md:text-left group transition-all shadow-2xl shadow-black/20"
                        >
                            <div className="w-11 h-11 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-8 mx-auto md:mx-0 group-hover:bg-white group-hover:text-black transition-colors">
                                <Lock className="w-5 h-5 sm:w-8 sm:h-8 text-white group-hover:text-black" />
                            </div>
                            <h3 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-tighter mb-1 sm:mb-2">Owner Entrance</h3>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Administrative controls, team management, and global financial oversight.
                            </p>
                        </motion.button>

                        <motion.button
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPortal('employee')}
                            className="bg-white border border-zinc-200 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-center md:text-left group transition-all shadow-xl shadow-black/5"
                        >
                            <div className="w-11 h-11 sm:w-16 sm:h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-8 mx-auto md:mx-0 group-hover:bg-black transition-colors">
                                <User className="w-5 h-5 sm:w-8 sm:h-8 text-black group-hover:text-white" />
                            </div>
                            <h3 className="text-xl sm:text-3xl font-black text-black uppercase italic tracking-tighter mb-1 sm:mb-2">Employee Portal</h3>
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Personal client management, track commissions, and log project progress.
                            </p>
                        </motion.button>
                    </div>

                    <div className="mt-10 sm:mt-20 text-center">
                        <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.3em]">
                            All Rights Reserved WebNegosyo 2026
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white border border-zinc-200 rounded-[3rem] p-10 sm:p-12 shadow-2xl shadow-black/5 relative">
                    <button
                        type="button"
                        title="Back to portal selection"
                        onClick={() => {
                            setPortal('selection');
                            setIsRegistering(false);
                            setError(null);
                        }}
                        className="absolute top-8 left-8 text-zinc-300 hover:text-ink transition-colors p-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-10 pt-4">
                        <LogoMark className="h-12 sm:h-16 w-auto text-ink mx-auto mb-2 sm:mb-3" />
                        <p className="text-lg font-extrabold tracking-tight text-ink mb-5">WebNegosyo</p>
                        <h1 className="text-3xl font-extrabold tracking-tight text-ink mb-2">
                            {isRegistering ? 'Join Team' : portal === 'owner' ? 'Owner Login' : 'Agent Access'}
                        </h1>
                        <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.3em]">
                            {portal === 'owner' ? 'Administrative Suite' : 'Sales Representative Portal'}
                        </p>
                    </div>

                    <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6" autoComplete="on">
                        {portal === 'owner' && (
                            // Gives the browser's password manager an account id to save the owner password under.
                            <input
                                type="text"
                                name="username"
                                autoComplete="username"
                                value={OWNER_EMAIL}
                                readOnly
                                tabIndex={-1}
                                aria-hidden="true"
                                className="sr-only"
                            />
                        )}
                        {isRegistering && (
                            <>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Account Name</span>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="w-full h-14 pl-14 pr-6 bg-zinc-50 border border-zinc-100 rounded-[1.2rem] focus:border-black outline-none font-bold text-sm transition-all"
                                            placeholder="Your Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {portal === 'employee' && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">GCash Number</span>
                                        <div className="relative">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300">
                                                <div className="text-[10px] font-black italic">GC</div>
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                className="w-full h-14 pl-14 pr-6 bg-zinc-50 border border-zinc-100 rounded-[1.2rem] focus:border-black outline-none font-bold text-sm transition-all text-black"
                                                placeholder="0912..."
                                                value={gcash}
                                                onChange={(e) => setGcash(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {portal !== 'owner' && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Account Username</span>
                                <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        autoComplete="username"
                                        required
                                        className="w-full h-14 pl-14 pr-6 bg-zinc-50 border border-zinc-100 rounded-[1.2rem] focus:border-black outline-none font-bold text-sm transition-all text-black"
                                        placeholder="e.g. admin_juan"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Secure Password</span>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete={isRegistering ? "new-password" : "current-password"}
                                    required
                                    className="w-full h-14 pl-14 pr-12 bg-zinc-50 border border-zinc-100 rounded-[1.2rem] focus:border-black outline-none font-bold text-sm transition-all"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-black transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {!isRegistering && (
                            <label className="flex items-center gap-3 px-2 cursor-pointer select-none group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <span className="w-5 h-5 rounded-md border-2 border-zinc-300 flex items-center justify-center transition-colors peer-checked:bg-ink peer-checked:border-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                </span>
                                <span className="text-[10px] font-black text-zinc-400 group-hover:text-ink uppercase tracking-widest transition-colors">
                                    Remember me &amp; save password
                                </span>
                            </label>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            disabled={loading || biometricLoading}
                            type="submit"
                            className="w-full h-16 bg-ink text-white rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                isRegistering ? "Register Account" : portal === 'owner' ? "Authorize Login" : "Agent Sign In"
                            )}
                        </button>

                        {portal === 'employee' && !isRegistering && (
                            <div className="pt-2 space-y-3">
                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-zinc-200"></div>
                                    <span className="flex-shrink mx-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">or quick sign in</span>
                                    <div className="flex-grow border-t border-zinc-200"></div>
                                </div>

                                <button
                                    type="button"
                                    disabled={loading || biometricLoading}
                                    onClick={handleBiometricLogin}
                                    className="w-full h-14 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2.5"
                                >
                                    {biometricLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Fingerprint className="w-5 h-5" />
                                            <span>Sign In with Fingerprint</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>

                    {portal !== 'owner' && (
                        <div className="mt-10 text-center">
                            <button
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors"
                            >
                                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center pb-8">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
                        All Rights Reserved WebNegosyo 2026
                    </p>
                </div>
            </motion.div>

            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => {
                                setShowSuccessModal(false);
                                setIsRegistering(false);
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 text-center shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-black" />

                            <div className="mb-8 relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                    className="w-24 h-24 bg-green-50 rounded-[2.5rem] flex items-center justify-center mx-auto"
                                >
                                    <CheckCircle className="w-12 h-12 text-green-500" />
                                </motion.div>
                                <motion.div
                                    animate={{
                                        rotate: [0, -10, 10, -10, 10, 0],
                                        y: [0, -5, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 1
                                    }}
                                    className="absolute -top-2 -right-2 w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg"
                                >
                                    <PartyPopper className="w-6 h-6" />
                                </motion.div>
                            </div>

                            <h2 className="text-3xl font-black tracking-tighter text-black uppercase italic mb-4">
                                Congratulations!
                            </h2>
                            <p className="text-zinc-500 text-sm font-bold leading-relaxed mb-8">
                                Congrats your employee now here in <span className="text-black font-black uppercase">WebNegosyo</span>. Welcome to the team!
                            </p>

                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setIsRegistering(false);
                                    setUsername('');
                                    setPassword('');
                                    setName('');
                                    setGcash('');
                                }}
                                className="w-full h-14 bg-black text-white rounded-[1.2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:shadow-xl hover:shadow-black/20 transition-all active:scale-95"
                            >
                                Proceed to Login
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};


