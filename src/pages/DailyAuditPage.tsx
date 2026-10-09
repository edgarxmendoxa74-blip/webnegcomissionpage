import React from 'react';
import { MasterAuditPanel } from '../components/MasterAuditPanel';

export const DailyAuditPage: React.FC = () => (
    <div className="space-y-5 animate-in fade-in duration-500">
        <div>
            <h1 className="text-lg font-black tracking-tight text-black uppercase">Daily Audit</h1>
            <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                Audits submitted by each account.
            </p>
        </div>

        <MasterAuditPanel />
    </div>
);
