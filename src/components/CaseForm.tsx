import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, Lock, Unlock, History, FileText, ArrowLeft, Plus, Trash2, ExternalLink, Search, AlertCircle, ChevronDown, Archive, UserPlus, Users, X, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from './SearchableSelect';
import ProsecutionSearchableSelect from './ProsecutionSearchableSelect';
import Timeline from './Timeline';
import { getDescriptiveStatus } from '../utils/caseUtils';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Case, Member } from '../types';
import { CASE_STATUS_OPTIONS, FINISHED_INSPECTION_RESULTS, FINISHED_INVESTIGATION_RESULTS, FINISHED_TRIAL_RESULTS } from '../constants';
import { queueRequest } from '../lib/offline';

interface CaseFormProps {
  caseId?: number;
  onSuccess: (targetTab?: string) => void;
}

const JUDICIAL_RANKS = [
  'رئيس الهيئة',
  'نائب رئيس هيئة',
  'وكيل عام اول',
  'وكيل عام',
  'رئيس نيابة أ',
  'رئيس نيابة ب',
  'وكيل نيابة من الفئة الممتازة',
  'وكيل نيابة',
  'مساعد نيابة',
  'معاون نيابة'
];

interface ReferralInvestigationMember {
  member_id: number;
  current_rank?: string;
  rank_at_violation: string;
  current_workplace?: string;
  workplace_at_violation: string;
  referral_authority: 'رئيس الهيئة' | 'وزير العدل';
  president_decision_date?: string;
  minister_decision_number?: string;
  minister_decision_year?: string;
  minister_decision_date?: string;
  result: string;
  // Dynamic result fields
  archive_date?: string;
  archive_type?: string;
  archive_verdict?: string;
  export_number?: string;
  export_date?: string;
  receipt_date?: string;
  note_text?: string;
  has_objection?: boolean;
  objection_incoming_number?: string;
  objection_date?: string;
  objection_number?: string;
  objection_committee_1?: number;
  objection_committee_2?: number;
  objection_committee_3?: number;
  objection_result?: string;
  objection_verdict?: string;
  reporter_id?: number;
  report_date?: string;
  join_date?: string;
  joined_case_number?: string;
  joined_case_year?: string;
  // Warning fields
  warning_export_number?: string;
  warning_export_date?: string;
  warning_receipt_date?: string;
  has_warning_objection?: boolean;
  warning_objection_incoming_number?: string;
  warning_objection_incoming_date?: string;
  warning_objection_number?: string;
  warning_objection_year?: string;
  warning_objection_sent_to_council_date?: string;
  warning_objection_council_decision_date?: string;
  warning_objection_council_session_date?: string;
  warning_objection_result?: string;
  warning_objection_verdict?: string;
  // Disciplinary Council fields (Regular)
  disciplinary_referral_date?: string;
  minister_referral_decision_number?: string;
  minister_referral_decision_date?: string;
  disciplinary_case_number?: string;
  disciplinary_case_year?: string;
  disciplinary_verdict_date?: string;
  disciplinary_verdict?: string;
  disciplinary_verdict_text?: string;
  // Disciplinary Council fields (Fitness)
  fitness_referral_date?: string;
  fitness_minister_decision_number?: string;
  fitness_minister_decision_date?: string;
  fitness_case_number?: string;
  fitness_case_year?: string;
  fitness_verdict_date?: string;
  fitness_verdict?: string;
  fitness_verdict_text?: string;
  fitness_return_to_inspection_date?: string;
}

interface ReferralInvestigation {
  number: string;
  year: string;
  type: 'فني' | 'مسلكي';
  subject: string;
  member_count: string;
  members: ReferralInvestigationMember[];
  investigator_id: number;
}

interface ReferralInvestigationSectionProps {
  memberIndex: number;
  control: any;
  register: any;
  watch: any;
  setValue: any;
  prosecutions: any[];
  isEditing: boolean;
  isLocked: (fieldName: string, index?: number, subField?: string, subIndex?: number, mIndex?: number) => boolean;
}

const ReferralInvestigationSection: React.FC<ReferralInvestigationSectionProps> = ({
  memberIndex,
  control,
  register,
  watch,
  setValue,
  prosecutions,
  isEditing,
  isLocked
}) => {
  const { fields: investigationFields, append: appendInvestigation, remove: removeInvestigation } = useFieldArray({
    control,
    name: `inspection_members.${memberIndex}.referral_investigations`
  });

  const referralInvestigationCount = watch(`inspection_members.${memberIndex}.referral_investigation_count`);

  useEffect(() => {
    const count = parseInt(referralInvestigationCount || '0');
    const currentFields = investigationFields.length;
    if (count > currentFields) {
      const newInvs = [];
      for (let i = currentFields; i < count; i++) {
        newInvs.push({ 
          number: '', 
          year: new Date().getFullYear().toString(), 
          type: 'فني', 
          subject: '', 
          member_count: '0', 
          members: [],
          investigator_id: 0
        });
      }
      appendInvestigation(newInvs);
    } else if (count < currentFields) {
      for (let i = currentFields - 1; i >= count; i--) {
        removeInvestigation(i);
      }
    }
  }, [referralInvestigationCount, appendInvestigation, removeInvestigation, investigationFields.length]);

  return (
    <div className="md:col-span-2 space-y-6 bg-amber-50/50 p-6 rounded-2xl border border-amber-100 mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-amber-600 text-white rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4" />
        </div>
        <h4 className="font-bold text-amber-900">بيانات الإحالة للتحقيق</h4>
      </div>

      <div className="space-y-1 max-w-xs">
        <label className="block text-sm font-medium text-gray-700">عدد التحقيقات المطلوب قيدها</label>
        <select 
          {...register(`inspection_members.${memberIndex}.referral_investigation_count`)}
          disabled={!isEditing || isLocked('inspection_members', memberIndex, 'referral_investigation_count')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
        >
          <option value="">اختر العدد...</option>
          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="space-y-8 mt-6">
        {investigationFields.map((field, index) => (
          <div key={field.id} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h5 className="font-bold text-gray-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" /> بيانات التحقيق رقم {index + 1}
              </h5>
            </div>

            <div className="max-w-xs">
              <SearchableSelect 
                label="العضو المحقق" 
                value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.investigator_id`)}
                disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'investigator_id', index)}
                onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.investigator_id`, m.id)} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">رقم التحقيق</label>
                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.number`)} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-500" />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">سنة التحقيق</label>
                <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.year`)} disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'year', index)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50">
                  {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">نوع التحقيق</label>
                <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.type`)} disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'type', index)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50">
                  <option value="فني">فني</option>
                  <option value="مسلكي">مسلكي</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">موضوع التحقيق</label>
              <textarea 
                {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.subject`)} 
                disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'subject', index)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" 
                placeholder="أدخل موضوع التحقيق..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-gray-700">الأعضاء المحالين للتحقيق</label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">عدد الأعضاء:</label>
                  <select 
                    onChange={(e) => {
                      const count = parseInt(e.target.value);
                      const currentMembers = watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members`) || [];
                      if (count > currentMembers.length) {
                        const newMembers = [...currentMembers];
                        for (let i = currentMembers.length; i < count; i++) {
                          newMembers.push({ 
                            member_id: 0, 
                            rank_at_violation: '', 
                            workplace_at_violation: '', 
                            referral_authority: 'رئيس الهيئة',
                            result: 'قيد التحقيق'
                          });
                        }
                        setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members`, newMembers);
                      } else {
                        setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members`, currentMembers.slice(0, count));
                      }
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                  >
                    <option value="0">0</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {(watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members`) || []).map((member: any, mIndex: number) => (
                  <div key={mIndex} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SearchableSelect 
                        label={`اسم العضو رقم ${mIndex + 1}`}
                        value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.member_id`)}
                        disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'member_id', index, mIndex)}
                        onChange={(m) => {
                          setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.member_id`, m.id);
                          setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.current_rank`, m.rank);
                          setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.current_workplace`, m.prosecution_office);
                        }}
                      />
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">الدرجة القضائية الحالية</label>
                        <input disabled value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.current_rank`) || ''} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">الدرجة القضائية وقت المخالفة</label>
                        <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.rank_at_violation`)} disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'rank_at_violation', index, mIndex)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm disabled:bg-gray-50">
                          <option value="">اختر الدرجة...</option>
                          {JUDICIAL_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">جهة العمل الحالية</label>
                        <input disabled value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.current_workplace`) || ''} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">جهة العمل وقت المخالفة</label>
                        <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.workplace_at_violation`)} disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'workplace_at_violation', index, mIndex)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm disabled:bg-gray-50">
                          <option value="">اختر جهة العمل...</option>
                          {prosecutions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">الأمر بالإحالة</label>
                        <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.referral_authority`)} disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'referral_authority', index, mIndex)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm disabled:bg-gray-50">
                          <option value="رئيس الهيئة">رئيس الهيئة</option>
                          <option value="وزير العدل">وزير العدل</option>
                        </select>
                      </div>
                    </div>

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.referral_authority`) === 'رئيس الهيئة' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">تاريخ صدور قرار معالي المستشار رئيس الهيئة</label>
                        <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.president_decision_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.referral_authority`) === 'وزير العدل' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">رقم القرار</label>
                          <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_decision_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">سنة القرار</label>
                          <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_decision_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">تاريخ صدور القرار</label>
                          <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_decision_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">نتيجة التحقيق للعضو</label>
                        <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`)} disabled={!isEditing || isLocked('referral_investigations', memberIndex, 'result', index, mIndex)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50">
                          <option value="قيد التحقيق">قيد التحقيق</option>
                          <option value="حفظ">حفظ</option>
                          <option value="ملحوظة كتابية">ملحوظة كتابية</option>
                          <option value="ملحوظة شفوية">ملحوظة شفوية</option>
                          <option value="تنبيه">تنبيه</option>
                          <option value="ضم لتحقيق اخر">ضم لتحقيق اخر</option>
                          <option value="إحالة إلى مجلس التأديب بهيئة عادية">إحالة إلى مجلس التأديب بهيئة عادية</option>
                          <option value="إحالة إلى مجلس التأديب بهيئة صلاحية">إحالة إلى مجلس التأديب بهيئة صلاحية</option>
                        </select>
                      </div>
                    </div>

                    {/* Dynamic detail fields based on result */}
                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'حفظ' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">تاريخ قرار الحفظ</label>
                          <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.archive_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">نوع قرار الحفظ</label>
                          <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.archive_type`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                            <option value="">اختر النوع...</option>
                            <option value="حفظ لعدم الصحة">حفظ لعدم الصحة</option>
                            <option value="حفظ لعدم المخالفة">حفظ لعدم المخالفة</option>
                            <option value="حفظ لسابقة الفصل في الموضوع">حفظ لسابقة الفصل في الموضوع</option>
                            <option value="حفظ لعدم كفاية الأدلة">حفظ لعدم كفاية الأدلة</option>
                            <option value="حفظ لانقضاء الادعاء التأديبي بترك الخدمة">حفظ لانقضاء الادعاء التأديبي بترك الخدمة</option>
                            <option value="حفظ لانقضاء الادعاء التأديبي بالوفاة">حفظ لانقضاء الادعاء التأديبي بالوفاة</option>
                            <option value="حفظ لانقضاء الادعاء التأديبي بمضي المدة">حفظ لانقضاء الادعاء التأديبي بمضي المدة</option>
                            <option value="حفظ لامتناع المسؤولية">حفظ لامتناع المسؤولية</option>
                            <option value="حفظ لامتناع العقاب">حفظ لامتناع العقاب</option>
                            <option value="حفظ لعدم الأهمية">حفظ لعدم الأهمية</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="block text-sm font-medium text-gray-700">منطوق قرار الحفظ</label>
                          <textarea 
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.archive_verdict`)} 
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            placeholder="أدخل منطوق القرار..."
                          />
                        </div>
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'ملحوظة كتابية' && (
                      <div className="space-y-4 mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم الصادر</label>
                            <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.export_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ الصادر</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.export_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ استلام العضو للملحوظة</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.receipt_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">نص الملحوظة</label>
                          <textarea 
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.note_text`)} 
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            placeholder="أدخل نص الملحوظة..."
                          />
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <input 
                            type="checkbox" 
                            id={`objection-investigation-${index}-${mIndex}`}
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.has_objection`)}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <label htmlFor={`objection-investigation-${index}-${mIndex}`} className="text-sm font-bold text-gray-700 cursor-pointer">هل اعترض العضو على الملحوظة؟</label>
                        </div>

                        {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.has_objection`) && (
                          <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200 space-y-6">
                            <h5 className="font-bold text-indigo-700 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> بيانات الاعتراض
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم وارد الاعتراض</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_incoming_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ الاعتراض</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم الاعتراض</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_number`)} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed text-gray-500" />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-gray-700">لجنة نظر الاعتراض (3 أعضاء)</label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SearchableSelect 
                                  label="عضو اللجنة 1" 
                                  value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_1`)}
                                  onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_1`, m.id)} 
                                />
                                <SearchableSelect 
                                  label="عضو اللجنة 2" 
                                  value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_2`)}
                                  onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_2`, m.id)} 
                                />
                                <SearchableSelect 
                                  label="عضو اللجنة 3" 
                                  value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_3`)}
                                  onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_3`, m.id)} 
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">نتيجة الاعتراض</label>
                                <select 
                                  {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_result`)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">اختر النتيجة...</option>
                                  <option value="قبول الاعتراض شكلاً ورفضه موضوعاً">قبول الاعتراض شكلاً ورفضه موضوعاً</option>
                                  <option value="قبول الاعتراض شكلاً وإلغاء الملحوظة">قبول الاعتراض شكلاً وإلغاء الملحوظة</option>
                                  <option value="قبول الاعتراض شكلاً مع التعديل">قبول الاعتراض شكلاً مع التعديل</option>
                                  <option value="رفض الاعتراض شكلاً">رفض الاعتراض شكلاً</option>
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                                <textarea 
                                  {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_verdict`)} 
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                  placeholder="أدخل منطوق قرار اللجنة..."
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'ملحوظة شفوية' && (
                      <div className="space-y-4 mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <SearchableSelect 
                              label="اسم القائم بتبليغ الملحوظة" 
                              value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.reporter_id`)}
                              onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.reporter_id`, m.id)} 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ الإبلاغ</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.report_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ استلام العضو للملحوظة</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.receipt_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">نص الملحوظة</label>
                          <textarea 
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.note_text`)} 
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            placeholder="أدخل نص الملحوظة..."
                          />
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <input 
                            type="checkbox" 
                            id={`objection-investigation-oral-${index}-${mIndex}`}
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.has_objection`)}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <label htmlFor={`objection-investigation-oral-${index}-${mIndex}`} className="text-sm font-bold text-gray-700 cursor-pointer">هل اعترض العضو على الملحوظة؟</label>
                        </div>

                        {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.has_objection`) && (
                          <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200 space-y-6">
                            <h5 className="font-bold text-indigo-700 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> بيانات الاعتراض
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم وارد الاعتراض</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_incoming_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ الاعتراض</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم الاعتراض</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_number`)} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed text-gray-500" />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-gray-700">لجنة نظر الاعتراض (3 أعضاء)</label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SearchableSelect 
                                  label="عضو اللجنة 1" 
                                  value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_1`)}
                                  onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_1`, m.id)} 
                                />
                                <SearchableSelect 
                                  label="عضو اللجنة 2" 
                                  value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_2`)}
                                  onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_2`, m.id)} 
                                />
                                <SearchableSelect 
                                  label="عضو اللجنة 3" 
                                  value={watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_3`)}
                                  onChange={(m) => setValue(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_committee_3`, m.id)} 
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">نتيجة الاعتراض</label>
                                <select 
                                  {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_result`)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">اختر النتيجة...</option>
                                  <option value="قبول الاعتراض شكلاً ورفضه موضوعاً">قبول الاعتراض شكلاً ورفضه موضوعاً</option>
                                  <option value="قبول الاعتراض شكلاً وإلغاء الملحوظة">قبول الاعتراض شكلاً وإلغاء الملحوظة</option>
                                  <option value="قبول الاعتراض شكلاً مع التعديل">قبول الاعتراض شكلاً مع التعديل</option>
                                  <option value="رفض الاعتراض شكلاً">رفض الاعتراض شكلاً</option>
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                                <textarea 
                                  {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.objection_verdict`)} 
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                  placeholder="أدخل منطوق قرار اللجنة..."
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'تنبيه' && (
                      <div className="space-y-4 mt-2 p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم صادر التنبيه للعضو</label>
                            <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_export_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ صادر التنبيه للعضو</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_export_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ استلام العضو للتنبيه</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_receipt_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <input 
                            type="checkbox" 
                            id={`warning-objection-${index}-${mIndex}`}
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.has_warning_objection`)}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <label htmlFor={`warning-objection-${index}-${mIndex}`} className="text-sm font-bold text-gray-700 cursor-pointer">هل اعترض العضو على التنبيه؟</label>
                        </div>

                        {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.has_warning_objection`) && (
                          <div className="mt-4 p-4 bg-white rounded-xl border border-orange-200 space-y-6">
                            <h5 className="font-bold text-orange-700 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> بيانات اعتراض العضو على التنبيه
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم وارد الاعتراض</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_incoming_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ وارد الاعتراض</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_incoming_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم الاعتراض</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_number`)} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed text-gray-500" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">سنة الاعتراض</label>
                                <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                                  <option value="">اختر السنة...</option>
                                  {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ ارسال الاعتراض للمجلس الاعلى</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_sent_to_council_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ ورود قرار المجلس الاعلى</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_council_decision_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ جلسة انعقاد المجلس الاعلى</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_council_session_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">نتيجة الاعتراض</label>
                                <select 
                                  {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_result`)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="">اختر النتيجة...</option>
                                  <option value="قبول الاعتراض شكلا والغائه">قبول الاعتراض شكلا والغائه</option>
                                  <option value="قبول الاعتراض شكلا ورفض موضوعا">قبول الاعتراض شكلا ورفض موضوعا</option>
                                  <option value="قبول الاعتراض شكلا مع التعديل">قبول الاعتراض شكلا مع التعديل</option>
                                  <option value="رفض الاعتراض شكلا">رفض الاعتراض شكلا</option>
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                                <textarea 
                                  {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.warning_objection_verdict`)} 
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                  placeholder="أدخل المنطوق..."
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'إحالة إلى مجلس التأديب بهيئة عادية' && (
                      <div className="space-y-4 mt-2 p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ الإحالة</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_referral_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم قرار وزير العدل بالإحالة</label>
                            <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_referral_decision_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ قرار وزير العدل بالإحالة</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_referral_decision_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم الدعوى التأديبية</label>
                            <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_case_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">سنة الدعوى</label>
                            <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_case_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                              <option value="">اختر السنة...</option>
                              {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ صدور الحكم في الدعوى</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_verdict_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">الحكم الصادر في الدعوى</label>
                            <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_verdict`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                              <option value="">اختر الحكم...</option>
                              <option value="براءة">براءة</option>
                              <option value="إنذار">إنذار</option>
                              <option value="لوم">لوم</option>
                              <option value="عزل">عزل</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                          <textarea 
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_verdict_text`)} 
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            placeholder="أدخل منطوق الحكم..."
                          />
                        </div>
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'إحالة إلى مجلس التأديب بهيئة صلاحية' && (
                      <div className="space-y-4 mt-2 p-4 bg-rose-50 rounded-lg border border-rose-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ الإحالة</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_referral_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم قرار وزير العدل بالإحالة</label>
                            <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_minister_decision_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ قرار وزير العدل بالإحالة</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_minister_decision_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم الدعوى</label>
                            <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_case_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">سنة الدعوى</label>
                            <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_case_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                              <option value="">اختر السنة...</option>
                              {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ صدور الحكم في الدعوى</label>
                            <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_verdict_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">الحكم الصادر في الدعوى</label>
                            <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_verdict`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                              <option value="">اختر الحكم...</option>
                              <option value="رفض دعوى الصلاحية">رفض دعوى الصلاحية</option>
                              <option value="رفض دعوى الصلاحية واعادة الى مجلس التأديب بهيئته العادية">رفض دعوى الصلاحية واعادة الى مجلس التأديب بهيئته العادية</option>
                              <option value="قبول دعوى الصلاحية واحالة العضو لوظيفة غير قضائية">قبول دعوى الصلاحية واحالة العضو لوظيفة غير قضائية</option>
                              <option value="قبول دعوى الصلاحية واحالة العضو للمعاش">قبول دعوى الصلاحية واحالة العضو للمعاش</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                          <textarea 
                            {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_verdict_text`)} 
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            placeholder="أدخل منطوق الحكم..."
                          />
                        </div>

                        {/* Special case: Refusal and return to regular session */}
                        {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_verdict`) === 'رفض دعوى الصلاحية واعادة الى مجلس التأديب بهيئته العادية' && (
                          <div className="mt-6 p-4 bg-white rounded-xl border border-rose-200 space-y-6">
                            <h6 className="font-bold text-rose-700 border-b border-rose-100 pb-2">بيانات الإحالة لمجلس التأديب (الهيئة العادية) بعد الإعادة</h6>
                            
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">تاريخ ورود الملف من مجلس الصلاحية الى التفتيش</label>
                              <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.fitness_return_to_inspection_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ الإحالة</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_referral_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم قرار وزير العدل بالإحالة</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_referral_decision_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ قرار وزير العدل بالإحالة</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.minister_referral_decision_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">رقم الدعوى التأديبية</label>
                                <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_case_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">سنة الدعوى</label>
                                <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_case_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                                  <option value="">اختر السنة...</option>
                                  {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ صدور الحكم في الدعوى</label>
                                <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_verdict_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">الحكم الصادر في الدعوى</label>
                                <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_verdict`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                                  <option value="">اختر الحكم...</option>
                                  <option value="براءة">براءة</option>
                                  <option value="إنذار">إنذار</option>
                                  <option value="لوم">لوم</option>
                                  <option value="عزل">عزل</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                              <textarea 
                                {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.disciplinary_verdict_text`)} 
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                placeholder="أدخل منطوق الحكم..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {watch(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.result`) === 'ضم لتحقيق اخر' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">تاريخ قرار الضم</label>
                          <input type="date" {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.join_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">رقم التحقيق المضموم إليه</label>
                          <input {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.joined_case_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" placeholder="رقم التحقيق..." />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">سنة التحقيق</label>
                          <select {...register(`inspection_members.${memberIndex}.referral_investigations.${index}.members.${mIndex}.joined_case_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                            <option value="">اختر السنة...</option>
                            {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CaseFormData {
  incoming_number: string;
  incoming_date: string;
  complainant: string;
  complainant_id_number: string;
  complaint_category: string;
  accused_member_count: string;
  accused_members: {
    member_id: number;
    member_rank: string;
    member_office: string;
  }[];
  member_id: number;
  member_rank: string;
  member_office: string;
  subject: string;
  case_number: string;
  case_year: string;
  prosecution_id: string;
  prosecution_name?: string;
  decision: string;
  case_status_v2?: string;
  case_status_detail?: string;
  trial_number?: string;
  trial_year?: string;
  examiner_id?: number;
  examiner_decision?: string;
  inspection_member_count: string;
  inspection_number: string;
  inspection_year: string;
  inspection_referral_date: string;
  inspector_id: number;
  inspection_members: {
    member_id: number;
    result: string;
    export_number?: string;
    export_date?: string;
    joined_case_number?: string;
    archive_date?: string;
    archive_type?: string;
    archive_verdict?: string;
    receipt_date?: string;
    note_text?: string;
    has_objection?: boolean;
    objection_incoming_number?: string;
    objection_date?: string;
    objection_number?: string;
    objection_committee_1?: number;
    objection_committee_2?: number;
    objection_committee_3?: number;
    objection_result?: string;
    objection_verdict?: string;
    reporter_id?: number;
    report_date?: string;
    join_date?: string;
    joined_case_year?: string;
    referral_investigation_count?: string;
    referral_investigations?: ReferralInvestigation[];
  }[];
  investigator_id?: number;
  investigation_number?: string;
  investigation_year?: string;
  [key: string]: any;
}

export default function CaseForm({ caseId, onSuccess }: CaseFormProps) {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'searcher' || (user?.role === 'data_collector' && !!caseId);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!caseId);
  const [showInvestigationForm, setShowInvestigationForm] = useState(false);
  const [activeStage, setActiveStage] = useState<'incoming' | 'inspection' | 'investigation' | 'council'>('incoming');
  const [prosecutions, setProsecutions] = useState<any[]>([]);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [pendingSaveData, setPendingSaveData] = useState<{data: any, isFinal: boolean} | null>(null);
  const numberingInProgress = useRef<Set<string>>(new Set());

    const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<CaseFormData>({
      defaultValues: {
        incoming_number: '',
        incoming_date: new Date().toISOString().split('T')[0],
        complainant: '',
        complainant_id_number: '',
        complaint_category: 'فنية',
        accused_member_count: '1',
        accused_members: [{ member_id: 0, member_rank: '', member_office: '' }],
        member_id: 0,
        member_rank: '',
        member_office: '',
        subject: '',
        case_number: '',
        case_year: new Date().getFullYear().toString(),
        prosecution_id: '',
        decision: '',
        examiner_id: 0,
        examiner_decision: '',
        inspection_member_count: '0',
        inspection_number: '',
        inspection_year: new Date().getFullYear().toString(),
        inspection_referral_date: new Date().toISOString().split('T')[0],
        inspector_id: 0,
        inspection_members: [{ member_id: 0, result: 'قيد الفحص' }],
        referral_investigations: [],
        investigation_number: '',
        investigation_year: new Date().getFullYear().toString(),
        case_status_v2: '',
        case_status_detail: ''
      }
    });

    const { fields: accusedMembersFields, append: appendAccusedMember, remove: removeAccusedMember } = useFieldArray({
      control,
      name: 'accused_members'
    });

    const accusedMemberCount = watch('accused_member_count');

    const isLocked = (fieldName: string, index?: number, subField?: string, subIndex?: number, mIndex?: number) => {
      if (!caseId || !currentCase) return false;
      
      // If the case is archived/closed, everything is locked
      if (currentCase.status === 'closed') return true;

      // Inspection number and year are immutable once saved, regardless of case status
      if (fieldName === 'inspection_number' && !!currentCase.inspection?.inspection_number) return true;
      if (fieldName === 'inspection_year' && !!currentCase.inspection?.year) return true;

      // Investigation number and year are immutable once saved
      if (fieldName === 'investigation_number' && !!currentCase.investigation?.investigation_number) return true;
      if (fieldName === 'investigation_year' && !!currentCase.investigation?.year) return true;

      // If the case is in draft or finished status, allow editing previously saved data
      if (currentCase.status === 'draft' || currentCase.status === 'finished') return false;

      // Handle nested fields like accused_members.0.member_id
      if (index !== undefined && subField) {
        if (fieldName === 'accused_members') {
          const memberIds = currentCase.member_ids || [];
          const memberId = memberIds[index];
          if (!memberId) return false;
          // If we have a member ID at this index, it was already saved
          return true;
        }
        if (fieldName === 'inspection_members') {
          const members = currentCase.inspection?.details?.members || [];
          const member = members[index];
          if (!member) return false;
          
          // Objection number is immutable once set
          if (subField === 'objection_number' && !!(member as any).objection_number) return true;

          const val = (member as any)[subField];
          return val !== undefined && val !== null && val !== '' && val !== 0 && val !== 'قيد الفحص';
        }
        if (fieldName === 'referral_investigations' && subIndex !== undefined) {
          const members = currentCase.inspection?.details?.members || [];
          const member = members[index];
          if (!member || !member.referral_investigations) return false;
          const inv = member.referral_investigations[subIndex];
          if (!inv) return false;

          // Investigation number in referral is immutable once set
          if (subField === 'number' && !!inv.number) return true;

          if (mIndex !== undefined) {
            const m = inv.members?.[mIndex];
            if (!m) return false;

            // Objection number in investigation member is immutable once set
            if (subField === 'objection_number' && !!(m as any).objection_number) return true;

            const val = (m as any)[subField];
            return val !== undefined && val !== null && val !== '' && val !== 0 && val !== 'قيد التحقيق';
          }

          const val = (inv as any)[subField];
          return val !== undefined && val !== null && val !== '' && val !== 0;
        }
      }

      // Special handling for mapped fields
      if (fieldName === 'inspection_number') return !!currentCase.inspection?.inspection_number;
      if (fieldName === 'inspection_year') return !!currentCase.inspection?.year;
      if (fieldName === 'inspection_referral_date') return !!currentCase.inspection?.referral_date;
      if (fieldName === 'inspector_id') return !!currentCase.inspection?.inspector_id;
      
      if (fieldName === 'investigation_number') return !!currentCase.investigation?.investigation_number;
      if (fieldName === 'investigation_year') return !!currentCase.investigation?.year;

      const value = (currentCase as any)[fieldName];
      return value !== undefined && value !== null && value !== '' && value !== 0;
    };

    useEffect(() => {
      const count = parseInt(accusedMemberCount || '1');
      const currentFields = accusedMembersFields.length;
      if (count > currentFields) {
        for (let i = currentFields; i < count; i++) {
          appendAccusedMember({ member_id: 0, member_rank: '', member_office: '' });
        }
      } else if (count < currentFields) {
        for (let i = currentFields - 1; i >= count; i--) {
          removeAccusedMember(i);
        }
      }
    }, [accusedMemberCount, appendAccusedMember, removeAccusedMember, accusedMembersFields.length]);

    const [formError, setFormError] = useState<string | null>(null);

    const onSubmit = async (data: any, isFinal: boolean) => {
      setIsLoading(true);
      setFormError(null);
      
      try {
        const payload = { ...data };
        
        // 1. Validation: Inspector cannot be same as member being inspected
        if (data.inspector_id && data.inspection_members) {
          const inspectorId = parseInt(data.inspector_id);
          const isSame = data.inspection_members.some((m: any) => parseInt(m.member_id) === inspectorId);
          if (isSame) {
            const msg = "لا يجوز أن يكون العضو الفاحص هو ذاته العضو المحال للفحص";
            setFormError(msg);
            window.alert(msg);
            setIsLoading(false);
            return;
          }
        }

        // 2. Validation: Investigator cannot be same as member being investigated
        if (data.inspection_members) {
          for (const m of data.inspection_members) {
            if (m.referral_investigations) {
              for (const inv of m.referral_investigations) {
                const investigatorId = parseInt(inv.investigator_id);
                if (investigatorId && inv.members) {
                  const isSame = inv.members.some((im: any) => parseInt(im.member_id) === investigatorId);
                  if (isSame) {
                    const msg = "لا يجوز أن يكون العضو المحقق هو ذاته العضو المحال للتحقيق";
                    setFormError(msg);
                    window.alert(msg);
                    setIsLoading(false);
                    return;
                  }
                }
              }
            }
          }
        }

        // 3. Reopen Reason: If case is finished and saving as draft
        if (caseId && currentCase?.status === 'finished' && !isFinal) {
          if (!reopenReason || reopenReason.trim() === '') {
            setPendingSaveData({ data, isFinal });
            setShowReopenModal(true);
            setIsLoading(false);
            return;
          }
          payload.reopen_reason = reopenReason;
          payload.reopened_by = "مدير النظام"; // In a real app, this would be the logged-in user
        }

        // Handle multiple accused members
        payload.member_id = data.accused_members?.[0]?.member_id || data.member_id;
        payload.member_ids = data.accused_members?.map((m: any) => m.member_id) || [payload.member_id];

        // Generate Title
        const incomingYear = data.incoming_date ? new Date(data.incoming_date).getFullYear() : '';
        let registeredAs = '';
        if (data.decision === 'فحص' && data.inspection_number) {
          registeredAs = `فحص ${data.inspection_number} لسنة ${data.inspection_year}`;
        } else if (data.decision === 'فحص وعرض' && data.examiner_id) {
          registeredAs = `فحص وعرض`;
        } else if (data.inspection_members?.[0]?.referral_investigations?.[0]?.number) {
          const inv = data.inspection_members[0].referral_investigations[0];
          registeredAs = `تحقيق ${inv.number} لسنة ${inv.year}`;
        } else if (data.case_number) {
          registeredAs = `دعوى ${data.case_number} لسنة ${data.case_year}`;
        }
        payload.title = `التعامل مع الوارد رقم (${data.incoming_number}) لسنة (${incomingYear}) المقيد (${registeredAs})`;
        
        // Set Status
        payload.status = isFinal ? 'finished' : 'draft';

        if (data.decision === 'فحص') {
          payload.inspection_data = {
            inspection_number: data.inspection_number,
            year: data.inspection_year,
            referral_date: data.inspection_referral_date,
            inspector_id: data.inspector_id,
            members: data.inspection_members
          };
        }

        const url = caseId ? `/api/cases/${caseId}` : '/api/cases';
        const method = caseId ? 'PATCH' : 'POST';

        console.log("Sending fetch request to:", url, "Method:", method, "Status:", payload.status);
        
        if (!navigator.onLine) {
          await queueRequest(url, method, payload);
          window.alert("تم حفظ البيانات محلياً (أوفلاين). سيتم المزامنة تلقائياً عند عودة الاتصال.");
          const targetTab = isFinal ? 'finished-incomings' : 'ongoing-incomings';
          onSuccess(targetTab);
          return;
        }

        const res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const result = await res.json();
          console.log("Submission success:", result);
          const targetTab = isFinal ? 'finished-incomings' : 'ongoing-incomings';
          onSuccess(targetTab);
        } else {
          const errData = await res.json();
          console.error("Server error:", errData);
          const msg = `فشل الحفظ: ${errData.error || 'خطأ في الخادم'}`;
          setFormError(msg);
          window.alert(msg);
        }
      } catch (error) {
        console.error("Submission error:", error);
        const msg = "حدث خطأ غير متوقع أثناء الحفظ";
        setFormError(msg);
        window.alert(msg);
      } finally {
        setIsLoading(false);
      }
    };

    const onInvalid = (errors: any) => {
      console.warn("Form validation failed:", errors);
      const messages: string[] = [];
      if (errors.incoming_number) messages.push("رقم الوارد مطلوب");
      if (errors.incoming_date) messages.push("تاريخ الوارد مطلوب");
      if (errors.subject) messages.push("موضوع الشكوى مطلوب");
      if (errors.member_id) messages.push("يجب اختيار العضو المشكو في حقه");
      if (errors.case_status_v2) messages.push("حالة الوارد مطلوبة");
      if (errors.case_status_detail) {
        const status = watch('case_status_v2');
        if (['منتهي فحص', 'منتهي تحقيق', 'منتهي محاكمة'].includes(status || '')) {
          messages.push("تفاصيل الحالة مطلوبة");
        }
      }
      
      const fullMsg = messages.length > 0 
        ? `يرجى استكمال البيانات التالية:\n- ${messages.join('\n- ')}`
        : "يرجى مراجعة البيانات المدخلة، هناك حقول غير مكتملة";
      
      setFormError(fullMsg);
      window.alert(fullMsg);
    };

    const handleSave = (isFinal: boolean) => {
      console.log("handleSave triggered", isFinal);
      handleSubmit(
        (data) => onSubmit(data, isFinal),
        onInvalid
      )();
    };

    const { fields, append, remove, replace } = useFieldArray({
      control,
      name: "inspection_members"
    });

    const decision = watch('decision');
    const inspectionMemberCount = watch('inspection_member_count');
    const inspectionYear = watch('inspection_year');
    const inspectionNumber = watch('inspection_number');

    useEffect(() => {
      // If it's already locked (saved in DB), don't touch it
      if (isLocked('inspection_number')) return;

      if (decision === 'فحص') {
        apiFetch(`/api/inspections/next-number?year=${inspectionYear || new Date().getFullYear().toString()}`)
          .then(res => res.json())
          .then(data => {
            if (data.nextNumber) {
              setValue('inspection_number', data.nextNumber);
            }
          });
      } else {
        setValue('inspection_number', '');
      }
    }, [decision, inspectionYear, setValue]);

    useEffect(() => {
      const timer = setTimeout(() => {
        const allMembers = watch('inspection_members') || [];
        
        // 1. Handle Referral Investigations Numbers
        const investigationsToNumber: { mIdx: number, invIdx: number, year: string, key: string }[] = [];
        allMembers.forEach((member: any, mIdx: number) => {
          const referrals = member.referral_investigations || [];
          referrals.forEach((inv: any, invIdx: number) => {
            const key = `inv-${mIdx}-${invIdx}`;
            if (!inv.number && !isLocked('referral_investigations', mIdx, 'number', invIdx) && !numberingInProgress.current.has(key)) {
              investigationsToNumber.push({ mIdx, invIdx, year: inv.year || new Date().getFullYear().toString(), key });
            }
          });
        });

        if (investigationsToNumber.length > 0) {
          investigationsToNumber.forEach(item => numberingInProgress.current.add(item.key));
          const year = investigationsToNumber[0].year;
          apiFetch(`/api/investigations/next-number?year=${year}`)
            .then(res => res.json())
            .then(data => {
              if (data.nextNumber) {
                let nextNum = parseInt(data.nextNumber);
                investigationsToNumber.forEach((item) => {
                  setValue(`inspection_members.${item.mIdx}.referral_investigations.${item.invIdx}.number`, nextNum.toString());
                  nextNum++;
                });
              }
            })
            .finally(() => {
              investigationsToNumber.forEach(item => numberingInProgress.current.delete(item.key));
            });
        }

        // 2. Handle Objection Numbers (Main and Referral)
        const objectionsToNumber: { path: string, year: string, key: string }[] = [];
        allMembers.forEach((member: any, mIdx: number) => {
          // Main member objection
          const mainKey = `obj-main-${mIdx}`;
          if (member.has_objection && !member.objection_number && !isLocked('inspection_members', mIdx, 'objection_number') && !numberingInProgress.current.has(mainKey)) {
            objectionsToNumber.push({ 
              path: `inspection_members.${mIdx}.objection_number`, 
              year: member.objection_year || new Date().getFullYear().toString(),
              key: mainKey
            });
          } else if (!member.has_objection && member.objection_number && !isLocked('inspection_members', mIdx, 'objection_number')) {
            setValue(`inspection_members.${mIdx}.objection_number`, '');
          }

          // Referral investigations objections
          const referrals = member.referral_investigations || [];
          referrals.forEach((inv: any, invIdx: number) => {
            const invMembers = inv.members || [];
            invMembers.forEach((invMember: any, memberIdx: number) => {
              const refKey = `obj-ref-${mIdx}-${invIdx}-${memberIdx}`;
              if (invMember.has_objection && !invMember.objection_number && !isLocked('referral_investigations', mIdx, 'objection_number', invIdx, memberIdx) && !numberingInProgress.current.has(refKey)) {
                objectionsToNumber.push({ 
                  path: `inspection_members.${mIdx}.referral_investigations.${invIdx}.members.${memberIdx}.objection_number`, 
                  year: new Date().getFullYear().toString(),
                  key: refKey
                });
              } else if (!invMember.has_objection && invMember.objection_number && !isLocked('referral_investigations', mIdx, 'objection_number', invIdx, memberIdx)) {
                setValue(`inspection_members.${mIdx}.referral_investigations.${invIdx}.members.${memberIdx}.objection_number`, '');
              }
            });
          });
        });

        if (objectionsToNumber.length > 0) {
          objectionsToNumber.forEach(item => numberingInProgress.current.add(item.key));
          const year = objectionsToNumber[0].year;
          apiFetch(`/api/objections/next-number?year=${year}`)
            .then(res => res.json())
            .then(data => {
              if (data.nextNumber) {
                let nextNum = parseInt(data.nextNumber);
                objectionsToNumber.forEach((item) => {
                  setValue(item.path as any, nextNum.toString());
                  nextNum++;
                });
              }
            })
            .finally(() => {
              objectionsToNumber.forEach(item => numberingInProgress.current.delete(item.key));
            });
        }
      }, 300); // 300ms debounce to allow all appends to finish
      return () => clearTimeout(timer);
    }, [watch('inspection_members'), setValue, isLocked]);

    const investigationYear = watch('investigation_year');
    useEffect(() => {
      // Fetch next investigation number when stage is investigation and no investigation exists yet
      if (currentCase?.current_stage === 'investigation' && !currentCase.investigation) {
        apiFetch(`/api/investigations/next-number?year=${investigationYear || new Date().getFullYear().toString()}`)
          .then(res => res.json())
          .then(data => {
            if (data.nextNumber) {
              setValue('investigation_number', data.nextNumber);
            }
          });
      }
    }, [currentCase, investigationYear, setValue]);

    useEffect(() => {
      const count = parseInt(inspectionMemberCount || '0');
      if (count > 0) {
        const currentFields = fields.length;
        if (count > currentFields) {
          const newMembers = [];
          for (let i = currentFields; i < count; i++) {
            newMembers.push({ member_id: 0, result: 'قيد الفحص' });
          }
          append(newMembers);
        } else if (count < currentFields) {
          for (let i = currentFields - 1; i >= count; i--) {
            remove(i);
          }
        }
      }
    }, [inspectionMemberCount]);

    useEffect(() => {
      if (caseId) {
        apiFetch(`/api/cases/${caseId}`)
          .then(res => res.json())
          .then(async (data) => {
            setCurrentCase(data);
            setActiveStage(data.current_stage);
            
            // Prepare accused_members if member_ids exists
            if (data.member_ids && data.member_ids.length > 0) {
              data.accused_member_count = data.member_ids.length.toString();
              
              // Fetch details for all members to populate rank/office
              const membersRes = await apiFetch('/api/members');
              const allMembers = await membersRes.json();
              
              data.accused_members = data.member_ids.map((id: number) => {
                const m = allMembers.find((x: any) => x.id === id);
                return {
                  member_id: id,
                  member_rank: m?.rank || '',
                  member_office: m?.prosecution_office || ''
                };
              });
            } else if (data.member_id) {
              data.accused_member_count = '1';
              data.accused_members = [{
                member_id: data.member_id,
                member_rank: data.member?.rank || '',
                member_office: data.member?.prosecution_office || ''
              }];
            }

            // Map inspection data to top-level form fields
            if (data.inspection) {
              data.inspection_number = data.inspection.inspection_number;
              data.inspection_year = data.inspection.year;
              data.inspection_referral_date = data.inspection.referral_date;
              data.inspector_id = data.inspection.inspector_id;
              if (data.inspection.details && data.inspection.details.members) {
                data.inspection_members = data.inspection.details.members;
                data.inspection_member_count = data.inspection.details.members.length.toString();
              }
            }

            reset(data);
            setIsEditing(true);
          });
      }
    }, [caseId, reset]);

    useEffect(() => {
      apiFetch('/api/prosecution-offices')
        .then(res => res.json())
        .then(data => setProsecutions(data.map((p: any) => ({ id: p.id, name: p.prosecution_name }))));
    }, []);

  const handleStageTransition = async (stage: string, status: string) => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      await apiFetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stage: stage, status }),
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInspection = async (data: any) => {
    // Validation: Inspector cannot be same as member being inspected
    if (data.inspector_id && currentCase?.member_ids) {
      const inspectorId = parseInt(data.inspector_id);
      const isSame = currentCase.member_ids.some((id: number) => id === inspectorId);
      if (isSame) {
        const msg = "لا يجوز أن يكون العضو الفاحص هو ذاته العضو المحال للفحص";
        window.alert(msg);
        return;
      }
    }
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, case_id: caseId }),
      });
      if (res.ok) window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    if (caseId) {
      apiFetch(`/api/audit/${caseId}`)
        .then(res => res.json())
        .then(data => setAuditLogs(data));
    }
  }, [caseId]);

  const handleCreateInvestigation = async (data: any) => {
    // Validation: Investigator cannot be same as member being investigated
    if (data.investigator_id && currentCase?.member_ids) {
      const investigatorId = parseInt(data.investigator_id);
      const isSame = currentCase.member_ids.some((id: number) => id === investigatorId);
      if (isSame) {
        const msg = "لا يجوز أن يكون العضو المحقق هو ذاته العضو المحال للتحقيق";
        window.alert(msg);
        return;
      }
    }
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...data, 
          year: data.investigation_year, // Map for backend
          case_id: caseId 
        }),
      });
      if (res.ok) window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCouncil = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/councils', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, case_id: caseId }),
      });
      if (res.ok) window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInspection = async (data: any) => {
    if (!currentCase?.inspection?.id) return;
    setIsLoading(true);
    try {
      await apiFetch(`/api/inspections/${currentCase.inspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInvestigation = async (data: any) => {
    if (!currentCase?.investigation?.id) return;
    setIsLoading(true);
    try {
      await apiFetch(`/api/investigations/${currentCase.investigation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('هل أنت متأكد من أرشفة هذا الملف؟ لا يمكن التعديل عليه بعد الأرشفة.')) return;
    setIsLoading(true);
    try {
      await apiFetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

    const handleReopenSubmit = () => {
      if (!reopenReason || reopenReason.trim() === '') {
        window.alert("يجب كتابة سبب لإعادة فتح القضية المنتهية");
        return;
      }
      if (pendingSaveData) {
        onSubmit(pendingSaveData.data, pendingSaveData.isFinal);
        setShowReopenModal(false);
      }
    };

  return (
    <div className="space-y-6">
      {/* Reopen Reason Modal */}
      <AnimatePresence>
        {showReopenModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-indigo-900">إعادة فتح القضية</h3>
                    <p className="text-xs text-indigo-600">يرجى توضيح سبب إعادة فتح هذا الملف المنتهي</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowReopenModal(false);
                    setPendingSaveData(null);
                  }}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">سبب إعادة الفتح <span className="text-red-500">*</span></label>
                  <textarea 
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="اكتب هنا سبب إعادة فتح القضية بالتفصيل..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleReopenSubmit}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    تأكيد إعادة الفتح
                  </button>
                  <button 
                    onClick={() => {
                      setShowReopenModal(false);
                      setPendingSaveData(null);
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {currentCase && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <Timeline 
            currentStage={currentCase.current_stage} 
            status={currentCase.status} 
            descriptiveStatus={getDescriptiveStatus(currentCase)}
          />
        </div>
      )}

      {/* Incoming Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">بيانات القيد والوارد</h3>
              <p className="text-xs text-gray-500">المرحلة الأولى: استلام وقيد الشكوى</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => caseId ? setIsEditing(false) : onSuccess()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" /> إلغاء
                </button>
                <button 
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle2 className="w-4 h-4" />}
                  حفظ واغلاق
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-8">
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-shake">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-bold">{formError}</p>
            </div>
          )}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(false);
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">رقم الوارد <span className="text-red-500">*</span></label>
              <input 
                {...register('incoming_number', { required: true })}
                disabled={!isEditing || isLocked('incoming_number')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50 ${errors.incoming_number ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="مثال: 1234"
              />
              {errors.incoming_number && <p className="text-xs text-red-500">هذا الحقل مطلوب</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">تاريخ الوارد <span className="text-red-500">*</span></label>
              <input 
                type="date"
                {...register('incoming_date', { required: true })}
                disabled={!isEditing || isLocked('incoming_date')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50 ${errors.incoming_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.incoming_date && <p className="text-xs text-red-500">هذا الحقل مطلوب</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">الشاكي</label>
              <input 
                {...register('complainant')}
                disabled={!isEditing || isLocked('complainant')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50"
                placeholder="اسم الشاكي..."
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">الرقم القومي للشاكي</label>
              <input 
                {...register('complainant_id_number')}
                disabled={!isEditing || isLocked('complainant_id_number')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50"
                placeholder="14 رقم..."
                maxLength={14}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">تصنيف الشكوى</label>
              <select 
                {...register('complaint_category')}
                disabled={!isEditing || isLocked('complaint_category')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50"
              >
                <option value="">اختر التصنيف...</option>
                <option value="فنية">فنية</option>
                <option value="مسلكية">مسلكية</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">عدد المشكو في حقهم</label>
              <select 
                {...register('accused_member_count')}
                disabled={!isEditing || isLocked('accused_member_count')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50 mb-4"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <div className="space-y-4">
                {accusedMembersFields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    <SearchableSelect 
                      label={`المشكو في حقه رقم (${index + 1})`}
                      value={watch(`accused_members.${index}.member_id`)}
                      disabled={!isEditing || isLocked('accused_members', index, 'member_id')}
                      onChange={(m) => {
                        setValue(`accused_members.${index}.member_id`, m.id);
                        setValue(`accused_members.${index}.member_rank`, m.rank);
                        setValue(`accused_members.${index}.member_office`, m.prosecution_office);
                        if (index === 0) {
                          setValue('member_id', m.id);
                          setValue('member_rank', m.rank);
                          setValue('member_office', m.prosecution_office);
                        }
                      }}
                    />
                    {watch(`accused_members.${index}.member_rank`) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-500">الدرجة</label>
                          <input disabled value={watch(`accused_members.${index}.member_rank`)} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-500">النيابة</label>
                          <input disabled value={watch(`accused_members.${index}.member_office`)} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="block text-sm font-medium text-gray-700">موضوع الشكوى <span className="text-red-500">*</span></label>
              <textarea 
                {...register('subject', { required: true })}
                disabled={!isEditing || isLocked('subject')}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50 ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="تفاصيل موضوع الشكوى..."
              />
              {errors.subject && <p className="text-xs text-red-500">هذا الحقل مطلوب</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">رقم القضية</label>
              <input {...register('case_number')} disabled={!isEditing || isLocked('case_number')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">سنة القضية</label>
              <select {...register('case_year')} disabled={!isEditing || isLocked('case_year')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50">
                <option value="">اختر السنة...</option>
                {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <ProsecutionSearchableSelect 
                label="اسم النيابة" 
                value={watch('prosecution_name')}
                disabled={!isEditing || isLocked('prosecution_name')}
                onChange={(name) => setValue('prosecution_name', name)}
                error={errors.prosecution_name?.message}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">القرار</label>
              <select 
                {...register('decision')}
                disabled={!isEditing || isLocked('decision')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50"
              >
                <option value="">اختر القرار...</option>
                <option value="فحص">فحص</option>
                <option value="فحص وعرض">فحص وعرض</option>
              </select>
            </div>

            {decision === 'فحص وعرض' && (
              <div className="md:col-span-3 space-y-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-blue-900">بيانات الفحص والعرض</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <SearchableSelect 
                      label="اسم العضو الفاحص" 
                      value={watch('examiner_id')}
                      disabled={!isEditing || isLocked('examiner_id')}
                      onChange={(m) => setValue('examiner_id', m.id)} 
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">نص قرار الفاحص</label>
                    <textarea 
                      {...register('examiner_decision')}
                      disabled={!isEditing || isLocked('examiner_decision')}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50"
                      placeholder="اكتب نص قرار الفاحص هنا..."
                    />
                  </div>
                </div>
              </div>
            )}

            {decision === 'فحص' && (
              <div className="md:col-span-3 space-y-6 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-indigo-900">بيانات الفحص</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">عدد الأعضاء المقيد ضدهم الفحص</label>
                    <select 
                      {...register('inspection_member_count')}
                      disabled={!isEditing || isLocked('inspection_member_count')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    >
                      <option value="">اختر العدد...</option>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">رقم الفحص (Unique) <span className="text-red-500">*</span></label>
                    <input 
                      {...register('inspection_number', { required: decision === 'فحص' })}
                      readOnly
                      disabled={!isEditing || isLocked('inspection_number')}
                      className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 cursor-not-allowed ${errors.inspection_number ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="سيتم توليد الرقم تلقائياً..."
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">سنة الفحص <span className="text-red-500">*</span></label>
                    <select 
                      {...register('inspection_year', { required: decision === 'فحص' })}
                      disabled={!isEditing || isLocked('inspection_year')}
                      className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 ${errors.inspection_year ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">اختر السنة...</option>
                      {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">تاريخ الإحالة</label>
                    <input 
                      type="date"
                      {...register('inspection_referral_date')}
                      disabled={!isEditing || isLocked('inspection_referral_date')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <SearchableSelect 
                      label="اسم العضو الفاحص" 
                      value={watch('inspector_id')}
                      disabled={!isEditing || isLocked('inspector_id')}
                      onChange={(m) => setValue('inspector_id', m.id)} 
                    />
                  </div>
                </div>

                {/* Dynamic Members List */}
                <div className="space-y-4 mt-6">
                  <h5 className="font-bold text-sm text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4" /> الأعضاء المقيد ضدهم الفحص ونتائجهم
                  </h5>
                  <div className="grid grid-cols-1 gap-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                          <SearchableSelect 
                            label={`اسم العضو رقم ${index + 1}`}
                            value={watch(`inspection_members.${index}.member_id`)}
                            disabled={!isEditing || isLocked('inspection_members', index, 'member_id')}
                            onChange={(m) => setValue(`inspection_members.${index}.member_id`, m.id)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">نتيجة رأي العضو الفاحص</label>
                          <select 
                            {...register(`inspection_members.${index}.result`)}
                            disabled={!isEditing || isLocked('inspection_members', index, 'result')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                          >
                            <option value="قيد الفحص">قيد الفحص</option>
                            <option value="حفظ">حفظ</option>
                            <option value="ملحوظة كتابية">ملحوظة كتابية</option>
                            <option value="ملحوظة شفوية">ملحوظة شفوية</option>
                            <option value="احالة الى التحقيق">احالة الى التحقيق</option>
                            <option value="ضم لفحص اخر">ضم لفحص اخر</option>
                            <option value="ضم لتحقيق اخر">ضم لتحقيق اخر</option>
                          </select>
                        </div>

                        {/* Dynamic detail fields based on result */}
                        {watch(`inspection_members.${index}.result`) === 'حفظ' && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">تاريخ قرار الحفظ</label>
                              <input type="date" {...register(`inspection_members.${index}.archive_date`)} disabled={!isEditing || isLocked('inspection_members', index, 'archive_date')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">نوع قرار الحفظ</label>
                              <select {...register(`inspection_members.${index}.archive_type`)} disabled={!isEditing || isLocked('inspection_members', index, 'archive_type')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50">
                                <option value="">اختر النوع...</option>
                                <option value="حفظ لعدم الصحة">حفظ لعدم الصحة</option>
                                <option value="حفظ لعدم المخالفة">حفظ لعدم المخالفة</option>
                                <option value="حفظ لسابقة الفصل في الموضوع">حفظ لسابقة الفصل في الموضوع</option>
                                <option value="حفظ لعدم كفاية الأدلة">حفظ لعدم كفاية الأدلة</option>
                                <option value="حفظ لانقضاء الادعاء التأديبي بترك الخدمة">حفظ لانقضاء الادعاء التأديبي بترك الخدمة</option>
                                <option value="حفظ لانقضاء الادعاء التأديبي بالوفاة">حفظ لانقضاء الادعاء التأديبي بالوفاة</option>
                                <option value="حفظ لانقضاء الادعاء التأديبي بمضي المدة">حفظ لانقضاء الادعاء التأديبي بمضي المدة</option>
                                <option value="حفظ لامتناع المسؤولية">حفظ لامتناع المسؤولية</option>
                                <option value="حفظ لامتناع العقاب">حفظ لامتناع العقاب</option>
                                <option value="حفظ لعدم الأهمية">حفظ لعدم الأهمية</option>
                              </select>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="block text-sm font-medium text-gray-700">منطوق قرار الحفظ</label>
                              <textarea 
                                {...register(`inspection_members.${index}.archive_verdict`)} 
                                disabled={!isEditing || isLocked('inspection_members', index, 'archive_verdict')}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" 
                                placeholder="أدخل منطوق القرار..."
                              />
                            </div>
                          </div>
                        )}

                              {watch(`inspection_members.${index}.result`) === 'ملحوظة كتابية' && (
                                <div className="md:col-span-2 space-y-4 mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                      <label className="block text-sm font-medium text-gray-700">رقم الصادر</label>
                                      <input {...register(`inspection_members.${index}.export_number`)} disabled={!isEditing || isLocked('inspection_members', index, 'export_number')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="block text-sm font-medium text-gray-700">تاريخ الصادر</label>
                                      <input type="date" {...register(`inspection_members.${index}.export_date`)} disabled={!isEditing || isLocked('inspection_members', index, 'export_date')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="block text-sm font-medium text-gray-700">تاريخ استلام العضو للملحوظة</label>
                                      <input type="date" {...register(`inspection_members.${index}.receipt_date`)} disabled={!isEditing || isLocked('inspection_members', index, 'receipt_date')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                                    </div>
                                  </div>
                            
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">نص الملحوظة</label>
                              <textarea 
                                {...register(`inspection_members.${index}.note_text`)} 
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                placeholder="أدخل نص الملحوظة..."
                              />
                            </div>

                            <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                              <input 
                                type="checkbox" 
                                id={`objection-${index}`}
                                {...register(`inspection_members.${index}.has_objection`)}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <label htmlFor={`objection-${index}`} className="text-sm font-bold text-gray-700 cursor-pointer">هل اعترض العضو على الملحوظة؟</label>
                            </div>

                            {watch(`inspection_members.${index}.has_objection`) && (
                              <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200 space-y-6">
                                <h5 className="font-bold text-indigo-700 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" /> بيانات الاعتراض
                                </h5>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">رقم وارد الاعتراض</label>
                                    <input {...register(`inspection_members.${index}.objection_incoming_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">تاريخ الاعتراض</label>
                                    <input type="date" {...register(`inspection_members.${index}.objection_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">رقم الاعتراض</label>
                                    <input {...register(`inspection_members.${index}.objection_number`)} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed text-gray-500" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">سنة الاعتراض</label>
                                    <select {...register(`inspection_members.${index}.objection_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                                      <option value="">اختر السنة...</option>
                                      {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <label className="block text-sm font-medium text-gray-700">لجنة نظر الاعتراض (3 أعضاء)</label>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SearchableSelect 
                                      label="عضو اللجنة 1" 
                                      value={watch(`inspection_members.${index}.objection_committee_1`)}
                                      onChange={(m) => setValue(`inspection_members.${index}.objection_committee_1`, m.id)} 
                                    />
                                    <SearchableSelect 
                                      label="عضو اللجنة 2" 
                                      value={watch(`inspection_members.${index}.objection_committee_2`)}
                                      onChange={(m) => setValue(`inspection_members.${index}.objection_committee_2`, m.id)} 
                                    />
                                    <SearchableSelect 
                                      label="عضو اللجنة 3" 
                                      value={watch(`inspection_members.${index}.objection_committee_3`)}
                                      onChange={(m) => setValue(`inspection_members.${index}.objection_committee_3`, m.id)} 
                                    />
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">نتيجة الاعتراض</label>
                                    <select 
                                      {...register(`inspection_members.${index}.objection_result`)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                      <option value="">اختر النتيجة...</option>
                                      <option value="قبول الاعتراض شكلاً ورفضه موضوعاً">قبول الاعتراض شكلاً ورفضه موضوعاً</option>
                                      <option value="قبول الاعتراض شكلاً وإلغاء الملحوظة">قبول الاعتراض شكلاً وإلغاء الملحوظة</option>
                                      <option value="قبول الاعتراض شكلاً مع التعديل">قبول الاعتراض شكلاً مع التعديل</option>
                                      <option value="رفض الاعتراض شكلاً">رفض الاعتراض شكلاً</option>
                                    </select>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                                    <textarea 
                                      {...register(`inspection_members.${index}.objection_verdict`)} 
                                      rows={3}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                      placeholder="أدخل منطوق قرار اللجنة..."
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {watch(`inspection_members.${index}.result`) === 'ملحوظة شفوية' && (
                          <div className="md:col-span-2 space-y-4 mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <SearchableSelect 
                                  label="اسم القائم بتبليغ الملحوظة" 
                                  value={watch(`inspection_members.${index}.reporter_id`)}
                                  disabled={!isEditing || isLocked('inspection_members', index, 'reporter_id')}
                                  onChange={(m) => setValue(`inspection_members.${index}.reporter_id`, m.id)} 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ الإبلاغ</label>
                                <input type="date" {...register(`inspection_members.${index}.report_date`)} disabled={!isEditing || isLocked('inspection_members', index, 'report_date')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">تاريخ استلام العضو للملحوظة</label>
                                <input type="date" {...register(`inspection_members.${index}.receipt_date`)} disabled={!isEditing || isLocked('inspection_members', index, 'receipt_date')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">نص الملحوظة</label>
                              <textarea 
                                {...register(`inspection_members.${index}.note_text`)} 
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                placeholder="أدخل نص الملحوظة..."
                              />
                            </div>

                            <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                              <input 
                                type="checkbox" 
                                id={`objection-oral-${index}`}
                                {...register(`inspection_members.${index}.has_objection`)}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <label htmlFor={`objection-oral-${index}`} className="text-sm font-bold text-gray-700 cursor-pointer">هل اعترض العضو على الملحوظة؟</label>
                            </div>

                            {watch(`inspection_members.${index}.has_objection`) && (
                              <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200 space-y-6">
                                <h5 className="font-bold text-indigo-700 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" /> بيانات الاعتراض
                                </h5>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">رقم وارد الاعتراض</label>
                                    <input {...register(`inspection_members.${index}.objection_incoming_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">تاريخ الاعتراض</label>
                                    <input type="date" {...register(`inspection_members.${index}.objection_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">رقم الاعتراض</label>
                                    <input {...register(`inspection_members.${index}.objection_number`)} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed text-gray-500" />
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <label className="block text-sm font-medium text-gray-700">لجنة نظر الاعتراض (3 أعضاء)</label>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SearchableSelect 
                                      label="عضو اللجنة 1" 
                                      value={watch(`inspection_members.${index}.objection_committee_1`)}
                                      onChange={(m) => setValue(`inspection_members.${index}.objection_committee_1`, m.id)} 
                                    />
                                    <SearchableSelect 
                                      label="عضو اللجنة 2" 
                                      value={watch(`inspection_members.${index}.objection_committee_2`)}
                                      onChange={(m) => setValue(`inspection_members.${index}.objection_committee_2`, m.id)} 
                                    />
                                    <SearchableSelect 
                                      label="عضو اللجنة 3" 
                                      value={watch(`inspection_members.${index}.objection_committee_3`)}
                                      onChange={(m) => setValue(`inspection_members.${index}.objection_committee_3`, m.id)} 
                                    />
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">نتيجة الاعتراض</label>
                                    <select 
                                      {...register(`inspection_members.${index}.objection_result`)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                      <option value="">اختر النتيجة...</option>
                                      <option value="قبول الاعتراض شكلاً ورفضه موضوعاً">قبول الاعتراض شكلاً ورفضه موضوعاً</option>
                                      <option value="قبول الاعتراض شكلاً وإلغاء الملحوظة">قبول الاعتراض شكلاً وإلغاء الملحوظة</option>
                                      <option value="قبول الاعتراض شكلاً مع التعديل">قبول الاعتراض شكلاً مع التعديل</option>
                                      <option value="رفض الاعتراض شكلاً">رفض الاعتراض شكلاً</option>
                                    </select>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">المنطوق</label>
                                    <textarea 
                                      {...register(`inspection_members.${index}.objection_verdict`)} 
                                      rows={3}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                      placeholder="أدخل منطوق قرار اللجنة..."
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {watch(`inspection_members.${index}.result`) === 'ضم لفحص اخر' && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">تاريخ قرار الضم</label>
                              <input type="date" {...register(`inspection_members.${index}.join_date`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">رقم الفحص المضموم إليه</label>
                              <input {...register(`inspection_members.${index}.joined_case_number`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" placeholder="رقم الفحص..." />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">سنة الفحص</label>
                              <select {...register(`inspection_members.${index}.joined_case_year`)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                                <option value="">اختر السنة...</option>
                                {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                          </div>
                        )}

                        {watch(`inspection_members.${index}.result`) === 'ضم لتحقيق اخر' && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">تاريخ قرار الضم</label>
                              <input type="date" {...register(`inspection_members.${index}.join_date`)} disabled={!isEditing || isLocked('inspection_members', index, 'join_date')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">رقم التحقيق المضموم إليه</label>
                              <input {...register(`inspection_members.${index}.joined_case_number`)} disabled={!isEditing || isLocked('inspection_members', index, 'joined_case_number')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50" placeholder="رقم التحقيق..." />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-sm font-medium text-gray-700">سنة التحقيق</label>
                              <select {...register(`inspection_members.${index}.joined_case_year`)} disabled={!isEditing || isLocked('inspection_members', index, 'joined_case_year')} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none disabled:bg-gray-50">
                                <option value="">اختر السنة...</option>
                                {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                          </div>
                        )}

                        {watch(`inspection_members.${index}.result`) === 'احالة الى التحقيق' && (
                          <ReferralInvestigationSection 
                            memberIndex={index}
                            control={control}
                            register={register}
                            watch={watch}
                            setValue={setValue}
                            prosecutions={prosecutions}
                            isEditing={isEditing}
                            isLocked={isLocked}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {caseId && !isEditing && currentCase?.current_stage === 'incoming' && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
            <button 
              onClick={() => handleStageTransition('inspection', 'inspection')}
              className="flex-1 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              إحالة للفحص <ExternalLink className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleStageTransition('investigation', 'investigation')}
              className="flex-1 py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
            >
              إحالة للتحقيق <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Inspection Section */}
      {(currentCase?.current_stage === 'inspection' || currentCase?.inspection) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 bg-indigo-50/30 flex items-center justify-between rounded-t-2xl">
             <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">دورة الفحص</h3>
                <p className="text-xs text-gray-500">المرحلة الثانية: الفحص الفني للشكوى</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            {currentCase?.inspection ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">رقم الفحص</p>
                    <p className="font-bold">{currentCase.inspection.inspection_number} لسنة {currentCase.inspection.year}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">تاريخ الإحالة</p>
                    <p className="font-bold">{currentCase.inspection.referral_date}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">النتيجة</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-indigo-600">{currentCase.inspection.result}</p>
                      {currentCase.inspection.result !== 'قيد الفحص' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> فحص منتهي
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Written Note Flow */}
                {currentCase.inspection.result === 'ملحوظة كتابية' && (
                  <div className="border-t border-gray-100 pt-8 space-y-6">
                    <h4 className="font-bold text-indigo-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> دورة الملحوظة الكتابية
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-3 space-y-1">
                        <label className="block text-sm font-medium text-gray-700">نص الملحوظة</label>
                        <textarea 
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          defaultValue={currentCase.inspection.details?.note_text}
                          onBlur={(e) => handleUpdateInspection({ details: { ...currentCase.inspection?.details, note_text: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">رقم صادر</label>
                        <input 
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          defaultValue={currentCase.inspection.details?.export_number}
                          onBlur={(e) => handleUpdateInspection({ details: { ...currentCase.inspection?.details, export_number: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">تاريخ صادر</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          defaultValue={currentCase.inspection.details?.export_date}
                          onBlur={(e) => handleUpdateInspection({ details: { ...currentCase.inspection?.details, export_date: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">هل اعترض؟</label>
                        <select 
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                          defaultValue={currentCase.inspection.details?.has_objection ? 'yes' : 'no'}
                          onChange={(e) => handleUpdateInspection({ details: { ...currentCase.inspection?.details, has_objection: e.target.value === 'yes' } })}
                        >
                          <option value="no">لا</option>
                          <option value="yes">نعم</option>
                        </select>
                      </div>
                    </div>

                    {/* Objection Section */}
                    {currentCase.inspection.details?.has_objection && (
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 space-y-6">
                        <h4 className="font-bold text-amber-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> دورة الاعتراض
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">رقم وارد الاعتراض</label>
                            <input className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">تاريخ الاعتراض</label>
                            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-sm font-medium text-gray-700">نتيجة الاعتراض</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                              <option value="">اختر النتيجة...</option>
                              <option value="قبول">قبول الاعتراض</option>
                              <option value="رفض">رفض الاعتراض</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Transition to Investigation */}
                {currentCase.inspection.result === 'إحالة للتحقيق' && currentCase.current_stage === 'inspection' && (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleStageTransition('investigation', 'investigation')}
                      className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20 flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> إنشاء ملف تحقيق جديد
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateInspection(Object.fromEntries(formData));
              }}>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">رقم الفحص</label>
                  <input name="inspection_number" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">سنة الفحص</label>
                  <input name="year" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">تاريخ الإحالة</label>
                  <input type="date" name="referral_date" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect 
                    label="العضو الفاحص" 
                    value={watch('inspector_id')}
                    onChange={(m) => setValue('inspector_id', m.id)} 
                  />
                  <input type="hidden" name="inspector_id" value={watch('inspector_id')} />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-sm font-medium text-gray-700">نتيجة الفحص</label>
                  <select name="result" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                    <option value="">اختر النتيجة...</option>
                    <option value="حفظ">حفظ</option>
                    <option value="إحالة للتحقيق">إحالة للتحقيق</option>
                    <option value="ملحوظة كتابية">ملحوظة كتابية</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20">حفظ وإغلاق الفحص</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Investigation Section */}
      {(currentCase?.current_stage === 'investigation' || currentCase?.investigation) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 bg-amber-50/30 flex items-center justify-between rounded-t-2xl">
             <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">دورة التحقيق</h3>
                <p className="text-xs text-gray-500">المرحلة الثالثة: التحقيق القضائي</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            {currentCase?.investigation ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">رقم التحقيق</p>
                    <p className="font-bold">{currentCase.investigation.investigation_number} لسنة {currentCase.investigation.year}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">نوع التحقيق</p>
                    <p className="font-bold">{currentCase.investigation.type}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">سلطة الإحالة</p>
                    <p className="font-bold text-amber-600">{currentCase.investigation.referral_authority}</p>
                  </div>
                </div>

                {/* Referral Authority Details */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
                  <h4 className="font-bold text-gray-700">بيانات سلطة الإحالة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentCase.investigation.referral_authority === 'رئيس الهيئة' ? (
                      <>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">تاريخ أمر الإحالة</label>
                          <input 
                            type="date" 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            defaultValue={currentCase.investigation.referral_details?.referral_date}
                            onBlur={(e) => handleUpdateInvestigation({ referral_details: { ...currentCase.investigation?.referral_details, referral_date: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">رقم كتاب الإحالة</label>
                          <input 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            defaultValue={currentCase.investigation.referral_details?.referral_number}
                            onBlur={(e) => handleUpdateInvestigation({ referral_details: { ...currentCase.investigation?.referral_details, referral_number: e.target.value } })}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">رقم قرار الوزير</label>
                          <input 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            defaultValue={currentCase.investigation.referral_details?.minister_decision_number}
                            onBlur={(e) => handleUpdateInvestigation({ referral_details: { ...currentCase.investigation?.referral_details, minister_decision_number: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">سنة القرار</label>
                          <input 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                            defaultValue={currentCase.investigation.referral_details?.minister_decision_year}
                            onBlur={(e) => handleUpdateInvestigation({ referral_details: { ...currentCase.investigation?.referral_details, minister_decision_year: e.target.value } })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Investigation Results */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">نتيجة التحقيق النهائية</label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                    defaultValue={currentCase.investigation.result || ''}
                    onChange={(e) => handleUpdateInvestigation({ result: e.target.value })}
                  >
                    <option value="">اختر النتيجة...</option>
                    <option value="حفظ">حفظ</option>
                    <option value="ملحوظة كتابية">ملحوظة كتابية</option>
                    <option value="تنبيه">تنبيه</option>
                    <option value="إحالة لمجلس التأديب">إحالة لمجلس التأديب</option>
                    <option value="ضم لتحقيق اخر">ضم لتحقيق اخر</option>
                  </select>
                  {currentCase.investigation.result === 'إحالة لمجلس التأديب' && currentCase.current_stage === 'investigation' && (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleStageTransition('council', 'council')}
                        className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20"
                      >
                        إحالة للمجلس التأديبي
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : showInvestigationForm ? (
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateInvestigation(Object.fromEntries(formData));
              }}>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">رقم التحقيق</label>
                  <input 
                    {...register('investigation_number')} 
                    readOnly 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">سنة التحقيق</label>
                  <input 
                    {...register('investigation_year')} 
                    readOnly 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 cursor-not-allowed" 
                  />
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect 
                    label="العضو المحقق" 
                    value={watch('investigator_id')}
                    onChange={(m) => setValue('investigator_id', m.id)} 
                  />
                  <input type="hidden" {...register('investigator_id')} />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">سلطة الإحالة</label>
                  <select name="referral_authority" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                    <option value="رئيس الهيئة">رئيس الهيئة</option>
                    <option value="وزير العدل">وزير العدل</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">نوع التحقيق</label>
                  <input name="type" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" placeholder="مثال: إداري / فني" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowInvestigationForm(false)}
                    className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="px-6 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-lg shadow-amber-600/20">حفظ بيانات التحقيق</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <History className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-6 font-medium">لم يتم إنشاء ملف تحقيق لهذا الوارد بعد</p>
                <button 
                  onClick={() => setShowInvestigationForm(true)}
                  className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20 flex items-center gap-2 hover:bg-amber-700 transition-all"
                >
                  <Plus className="w-5 h-5" /> إنشاء ملف تحقيق جديد
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disciplinary Council Section */}
      {(currentCase?.current_stage === 'council' || (currentCase?.councils && currentCase.councils.length > 0)) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 bg-red-50/30 flex items-center justify-between rounded-t-2xl">
             <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center">
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">مجلس التأديب</h3>
                <p className="text-xs text-gray-500">المرحلة النهائية: المحاكمة التأديبية</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            {currentCase?.councils && currentCase.councils.length > 0 ? (
              <div className="space-y-6">
                {currentCase.councils.map((council, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{council.type === 'normal' ? 'الهيئة العادية' : 'هيئة الصلاحية'}</span>
                      <span className="text-xs text-gray-400">رقم صادر: {council.details?.export_number}</span>
                    </div>
                    <p className="font-bold text-gray-900 mb-2">منطوق الحكم: {council.result}</p>
                    <p className="text-sm text-gray-600">{council.details?.verdict_text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateCouncil(Object.fromEntries(formData));
              }}>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">نوع المجلس</label>
                  <select name="type" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                    <option value="normal">الهيئة العادية</option>
                    <option value="fitness">هيئة الصلاحية</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">رقم صادر المجلس</label>
                  <input name="export_number" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-sm font-medium text-gray-700">منطوق الحكم</label>
                  <select name="result" required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                    <option value="">اختر المنطوق...</option>
                    <option value="إنذار">إنذار</option>
                    <option value="لوم">لوم</option>
                    <option value="عزل">عزل</option>
                    <option value="رفض">رفض (هيئة الصلاحية)</option>
                    <option value="قبول">قبول (هيئة الصلاحية)</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-sm font-medium text-gray-700">نص المنطوق التفصيلي</label>
                  <textarea name="verdict_text" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-600/20">حفظ الحكم النهائي</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Audit Log Section */}
      {caseId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <button 
            onClick={() => setShowAudit(!showAudit)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-lg">سجل العمليات (Audit Log)</h3>
                <p className="text-xs text-gray-500">تتبع جميع التغييرات التي تمت على هذا الملف</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${showAudit ? 'rotate-180' : ''}`} />
          </button>
          
          {showAudit && (
            <div className="p-8 border-t border-gray-100 bg-gray-50/50">
              <div className="space-y-4">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-1 bg-indigo-500 rounded-full" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{log.action}</span>
                        <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        قام <span className="font-bold">{log.user_name}</span> بإجراء عملية <span className="font-bold">{log.action}</span> على جدول <span className="font-bold">{log.table_name}</span>
                      </p>
                      {log.new_values && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-500 overflow-x-auto">
                          {log.new_values}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center text-gray-400 py-8">لا توجد سجلات حالياً</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Final Status Section - Always at the bottom */}
      {isEditing && currentCase?.status !== 'closed' && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 mt-8 overflow-hidden">
          <div className="p-4 bg-indigo-600 text-white flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold">تحديث حالة الوارد النهائية</h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">حالة الوارد <span className="text-red-500">*</span></label>
              <select 
                {...register('case_status_v2', { required: true })}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.case_status_v2 ? 'border-red-500 bg-red-50' : 'border-indigo-100 bg-indigo-50/30'}`}
              >
                <option value="">اختر الحالة...</option>
                {CASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.case_status_v2 && <p className="text-xs text-red-500 font-bold">يجب اختيار حالة الوارد</p>}
            </div>

            {['منتهي فحص', 'منتهي تحقيق', 'منتهي محاكمة'].includes(watch('case_status_v2') || '') && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-gray-700">تفاصيل الحالة <span className="text-red-500">*</span></label>
                <select 
                  {...register('case_status_detail', { required: true })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.case_status_detail ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}
                >
                  <option value="">اختر النتيجة...</option>
                  {watch('case_status_v2') === 'منتهي فحص' && FINISHED_INSPECTION_RESULTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {watch('case_status_v2') === 'منتهي تحقيق' && FINISHED_INVESTIGATION_RESULTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {watch('case_status_v2') === 'منتهي محاكمة' && FINISHED_TRIAL_RESULTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.case_status_detail && <p className="text-xs text-red-500 font-bold">يجب اختيار تفاصيل الحالة</p>}
              </div>
            )}

            {['قيد محاكمة', 'منتهى محاكمة'].includes(watch('case_status_v2') || '') && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">رقم دعوى التأديب</label>
                  <input 
                    {...register('trial_number')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="رقم الدعوى..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">سنة دعوى التأديب</label>
                  <select 
                    {...register('trial_year')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">اختر السنة...</option>
                    {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
            {!isReadOnly && currentCase?.status === 'finished' && (
              <button 
                type="button"
                onClick={handleArchive}
                disabled={isLoading}
                className="flex items-center gap-3 px-10 py-4 text-lg font-bold text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/30 disabled:opacity-50 active:scale-95"
              >
                {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Archive className="w-6 h-6" />}
                أرشفة الملف (إغلاق نهائي)
              </button>
            )}

            {!isReadOnly && ['منتهي فحص', 'منتهي تحقيق', 'منتهي محاكمة'].includes(watch('case_status_v2') || '') && (currentCase?.status as any) !== 'finished' && (currentCase?.status as any) !== 'closed' && (
              <button 
                type="button"
                onClick={() => handleSave(true)}
                disabled={isLoading}
                className="flex items-center gap-3 px-10 py-4 text-lg font-bold text-white bg-amber-600 rounded-2xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/30 disabled:opacity-50 active:scale-95"
              >
                {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle2 className="w-6 h-6" />}
                حفظ كملف منتهي
              </button>
            )}

             {!isReadOnly && (currentCase?.status as any) !== 'closed' && (
               <button 
                type="button"
                onClick={() => handleSave(false)}
                disabled={isLoading}
                className="flex items-center gap-3 px-10 py-4 text-lg font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 active:scale-95"
              >
                {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-6 h-6" />}
                حفظ كمسودة
              </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

