import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { Member } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchableSelectProps {
  label: string;
  placeholder?: string;
  value?: number;
  onChange: (member: Member) => void;
  error?: string;
  disabled?: boolean;
}

export default function SearchableSelect({ label, placeholder, value, onChange, error, disabled }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const fetchMembers = async () => {
      try {
        const url = search 
          ? `/api/members?search=${encodeURIComponent(search)}`
          : '/api/members';
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMembers(data);
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };
    
    const timer = setTimeout(fetchMembers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, disabled]);

  // Load selected member details when value changes
  useEffect(() => {
    const loadSelected = async () => {
      if (value && value !== 0) {
        // If we already have it in the members list, use it
        const existing = members.find(m => m.id === value);
        if (existing) {
          setSelectedMember(existing);
          return;
        }

        // Otherwise fetch it
        try {
          const res = await fetch(`/api/members`);
          const data = await res.json();
          const found = data.find((m: Member) => m.id === value);
          if (found) setSelectedMember(found);
        } catch (err) {
          console.error("Error loading selected member:", err);
        }
      } else {
        setSelectedMember(null);
      }
    };
    loadSelected();
  }, [value, members]);

  // Ensure members are loaded when dropdown opens
  useEffect(() => {
    if (isOpen && members.length === 0 && !disabled) {
      fetch('/api/members')
        .then(res => res.json())
        .then(data => setMembers(data))
        .catch(err => console.error(err));
    }
  }, [isOpen, members.length, disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 bg-white border rounded-lg transition-all min-h-[42px]",
          disabled ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-75" : "cursor-pointer border-slate-300 hover:border-slate-400",
          error ? "border-red-500" : "",
          isOpen && !disabled && "ring-2 ring-indigo-500 border-transparent shadow-sm"
        )}
      >
        <span className={cn("truncate text-slate-900", !selectedMember && "text-slate-400")}>
          {selectedMember ? `${selectedMember.name} - ${selectedMember.rank}` : placeholder || "اختر العضو..."}
        </span>
        {!disabled && <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />}
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
                placeholder="بحث بالاسم أو الدرجة أو النيابة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 bg-white">
            {members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className={cn(
                    "px-4 py-3 text-sm cursor-pointer hover:bg-indigo-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors",
                    selectedMember?.id === member.id && "bg-indigo-50 text-indigo-700 font-semibold"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMember(member);
                    onChange(member);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-slate-900">{member.name}</span>
                    <span className="text-[11px] text-slate-500">{member.rank} • {member.prosecution_office}</span>
                  </div>
                  {selectedMember?.id === member.id && <Check className="w-4 h-4 text-indigo-600" />}
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
