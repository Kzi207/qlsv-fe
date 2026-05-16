import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionCardProps {
  section: any;
  studentSecTotal: number;
  adminSecTotal: number;
  isExpanded: boolean;
  isAdminMode?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  studentSecTotal,
  adminSecTotal,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="card-premium overflow-hidden border-none shadow-xl shadow-slate-200/20 animate-fade-up">
      <button onClick={onToggle} className="group flex w-full items-center justify-between p-3 md:p-4 bg-white transition-colors">
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all duration-300 ${
              isExpanded 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {section.id.split('-')[1]}
          </div>
          <div className="space-y-0.5 text-left min-w-0">
            <h3 className={`text-xs md:text-sm font-bold leading-tight transition-colors ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>
              {section.title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 border border-slate-100">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">SV</span>
                <span className="text-[10px] font-black text-slate-700">{studentSecTotal}đ</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 border border-blue-100">
                <span className="text-[8px] font-black uppercase tracking-wider text-blue-400 whitespace-nowrap">Lớp</span>
                <span className="text-[10px] font-black text-blue-600">{adminSecTotal}đ</span>
              </div>
            </div>
          </div>
        </div>
        <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionCard;
