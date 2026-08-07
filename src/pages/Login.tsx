import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertCircle, Loader2, User, UserPlus, Eye, EyeOff, CheckCircle, PartyPopper } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const [portal, setPortal] = useState<'selection' | 'owner' | 'employee'>('selection');
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [gcash, setGcash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (portal === 'owner') {
                const ownerEmail = 'owner@webnegosyo.com';
                
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
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
                <div className="w-full max-w-4xl">
                    <div className="text-center mb-16">
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-black uppercase italic mb-4">WebNegosyo</h1>
                        <p className="text-zinc-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Management for Commissions</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.button
                            whileHover={{ y: -10, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPortal('owner')}
                            className="bg-black p-12 rounded-[3.5rem] text-center md:text-left group transition-all shadow-2xl shadow-black/20"
                        >
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 group-hover:bg-white group-hover:text-black transition-colors">
                                <Lock className="w-8 h-8 text-white group-hover:text-black" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Owner Entrance</h3>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Administrative controls, team management, and global financial oversight.
                            </p>
                        </motion.button>

                        <motion.button
                            whileHover={{ y: -10, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPortal('employee')}
                            className="bg-white border border-zinc-100 p-12 rounded-[3.5rem] text-center md:text-left group transition-all shadow-xl shadow-black/5"
                        >
                            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 group-hover:bg-black transition-colors">
                                <User className="w-8 h-8 text-black group-hover:text-white" />
                            </div>
                            <h3 className="text-3xl font-black text-black uppercase italic tracking-tighter mb-2">Employee Portal</h3>
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Personal client management, track commissions, and log project progress.
                            </p>
                        </motion.button>
                    </div>

                    <div className="mt-20 text-center">
                        <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.3em]">
                            © All Rights Reserved WebNegosyo 2026
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white border border-zinc-100 rounded-[3rem] p-12 shadow-2xl shadow-black/5 relative">
                    <button
                        title="Back to portal selection"
                        onClick={() => {
                            setPortal('selection');
                            setIsRegistering(false);
                            setError(null);
                        }}
                        className="absolute top-8 left-8 text-zinc-300 hover:text-black transition-colors p-2"
                    >
                        <AlertCircle className="w-5 h-5 rotate-180" />
                    </button>

                    <div className="text-center mb-10 pt-4">
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl ${portal === 'owner' ? 'bg-black' : 'bg-zinc-100'}`}>
                            {isRegistering ? <UserPlus className={`w-10 h-10 ${portal === 'owner' ? 'text-white' : 'text-black'}`} /> :
                                portal === 'owner' ? <Lock className="w-10 h-10 text-white" /> : <User className="w-10 h-10 text-black" />}
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-black uppercase italic mb-2">
                            {isRegistering ? 'Join Team' : portal === 'owner' ? 'Owner Login' : 'Agent Access'}
                        </h1>
                        <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.3em]">
                            {portal === 'owner' ? 'Administrative Suite' : 'Sales Representative Portal'}
                        </p>
                    </div>

                    <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
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
                                    required
                                    className="w-full h-14 pl-14 pr-12 bg-zinc-50 border border-zinc-100 rounded-[1.2rem] focus:border-black outline-none font-bold text-sm transition-all"
                                    placeholder="••••••••"
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

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full h-16 bg-black text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                isRegistering ? "Register Account" : portal === 'owner' ? "Authorize Login" : "Agent Sign In"
                            )}
                        </button>
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
                        © All Rights Reserved WebNegosyo 2026
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
