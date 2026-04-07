import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProsecutionOffice {
  id: number;
  prosecution_name: string;
}

interface ProsecutionSearchableSelectProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange: (name: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function ProsecutionSearchableSelect({ label, placeholder, value, onChange, error, disabled }: ProsecutionSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [offices, setOffices] = useState<ProsecutionOffice[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(value || null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const res = await fetch('/api/prosecution-offices');
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setOffices(data);
      } catch (err) {
        console.error("Error fetching offices:", err);
      }
    };
    fetchOffices();
  }, []);

  useEffect(() => {
    setSelectedOffice(value || null);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOffices = offices.filter(office => 
    office.prosecution_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 bg-white border rounded-lg transition-all min-h-[42px]",
          disabled ? "bg-gray-50 cursor-not-allowed opacity-75" : "cursor-pointer",
          error ? "border-red-500" : "border-slate-300 hover:border-slate-400",
          isOpen && "ring-2 ring-indigo-500 border-transparent shadow-sm"
        )}
      >
        <span className={cn("truncate text-slate-900", !selectedOffice && "text-slate-400")}>
          {selectedOffice || placeholder || "اختر النيابة..."}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-64 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                placeholder="بحث باسم النيابة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 bg-white">
            {filteredOffices.length > 0 ? (
              filteredOffices.map((office) => (
                <div
                  key={office.id}
                  className={cn(
                    "px-4 py-3 text-sm cursor-pointer hover:bg-indigo-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors",
                    selectedOffice === office.prosecution_name && "bg-indigo-50 text-indigo-700 font-semibold"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOffice(office.prosecution_name);
                    onChange(office.prosecution_name);
                    setIsOpen(false);
                  }}
                >
                  <span className="font-medium text-slate-900">{office.prosecution_name}</span>
                  {selectedOffice === office.prosecution_name && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-slate-400 text-sm italic">
                لا يوجد نتائج للبحث...
              </div>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><span className="w-1 h-1 bg-red-500 rounded-full" /> {error}</p>}
    </div>
  );
}
