import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { STATUS_TRANSLATIONS } from '../constants';

interface TimelineProps {
  currentStage: 'incoming' | 'inspection' | 'investigation' | 'council';
  status: string;
  descriptiveStatus?: string;
}

const stages = [
  { id: 'incoming', label: 'الوارد', description: 'استلام وقيد الشكوى' },
  { id: 'inspection', label: 'الفحص', description: 'مرحلة الفحص الفني' },
  { id: 'investigation', label: 'التحقيق', description: 'مرحلة التحقيق القضائي' },
  { id: 'council', label: 'المجلس', description: 'مجلس التأديب / الصلاحية' },
];

export default function Timeline({ currentStage, status, descriptiveStatus }: TimelineProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500" 
          style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
        />

        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center group">
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                isCompleted ? "bg-indigo-600 border-indigo-600 text-white" :
                isCurrent ? "bg-white border-indigo-600 text-indigo-600 scale-110 shadow-lg" :
                "bg-white border-gray-300 text-gray-400"
              )}>
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> :
                 isCurrent ? <Clock className="w-6 h-6 animate-pulse" /> :
                 <Circle className="w-6 h-6" />}
              </div>
              <div className="absolute top-12 text-center w-32">
                <p className={clsx(
                  "text-sm font-bold",
                  isCurrent ? "text-indigo-700" : "text-gray-600"
                )}>{stage.label}</p>
                <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-16 flex justify-center">
        <div className={clsx(
          "px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2",
          status === 'closed' ? "bg-gray-100 text-gray-600" :
          status === 'finished' || descriptiveStatus?.includes('منتهي') ? "bg-green-100 text-green-700" :
          "bg-amber-100 text-amber-700"
        )}>
          <AlertCircle className="w-3.5 h-3.5" />
          الحالة الحالية: {descriptiveStatus || STATUS_TRANSLATIONS[status] || status}
        </div>
      </div>
    </div>
  );
}
