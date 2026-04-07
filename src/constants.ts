export const STATUS_TRANSLATIONS: Record<string, string> = {
  'draft': 'مسودة',
  'incoming': 'وارد',
  'inspection_presentation': 'فحص وعرض',
  'inspection': 'قيد الفحص',
  'inspection_finished': 'منتهي فحص',
  'investigation': 'قيد التحقيق',
  'investigation_finished': 'منتهي تحقيق',
  'council': 'قيد مجلس التأديب',
  'finished': 'منتهية',
  'closed': 'مؤرشف'
};

export const STAGE_TRANSLATIONS: Record<string, string> = {
  'incoming': 'الوارد',
  'inspection': 'الفحص',
  'investigation': 'التحقيق',
  'council': 'مجلس التأديب'
};

export const CASE_STATUS_OPTIONS = [
  'وارد قيد المراجعة',
  'قيد الفحص',
  'منتهي فحص',
  'قيد تحقيق',
  'منهى تحقيق',
  'قيد محاكمة',
  'منتهى محاكمة'
];

export const FINISHED_INSPECTION_RESULTS = [
  'حفظ',
  'ملحوظة كتابية',
  'ملحوظة شفوية',
  'ضم لفحص اخر',
  'ضم لتحقيق اخر'
];

export const FINISHED_INVESTIGATION_RESULTS = [
  'حفظ',
  'ملحوظة كتابية',
  'ملحوظة شفوية',
  'تنبيه',
  'ضم لتحقيق اخر',
  'إحالة إلى مجلس التأديب بهيئة عادية',
  'إحالة إلى مجلس التأديب بهيئة صلاحية'
];

export const FINISHED_TRIAL_RESULTS = [
  'براءة',
  'انذار',
  'لوم',
  'عزل',
  'رفض صلاحية',
  'قبول صلاحية احالة للمعاش',
  'قبول صلاحية واحالة وظيفة غير قضائية'
];
