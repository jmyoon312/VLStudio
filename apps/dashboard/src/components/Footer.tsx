import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Footer = ({ className }: { className?: string }) => {
    return (
        <div className={cn("mt-auto pt-12 pb-8 border-t border-pixie-border/60 flex flex-col items-center gap-6 w-full", className)}>
            <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-bold text-pixie-sub uppercase tracking-widest">© 2026 ViraLoop Intelligence</span>
                <div className="flex gap-6">
                    <Link to="#" className="text-[10px] font-bold text-pixie-sub hover:text-pixie-blue uppercase transition-colors">Privacy Policy</Link>
                    <Link to="#" className="text-[10px] font-bold text-pixie-sub hover:text-pixie-blue uppercase transition-colors">Terms of Service</Link>
                </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-pixie-border shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                <span className="text-[9px] font-bold text-pixie-text uppercase tracking-tighter">System Sovereign Link Active</span>
            </div>
        </div>
    );
};

export default Footer;
