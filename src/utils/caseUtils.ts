import { Case } from '../types';
import { STATUS_TRANSLATIONS, STAGE_TRANSLATIONS } from '../constants';

export const getDescriptiveStatus = (c: Case): string => {
  if (c.case_status_v2) {
    let status = c.case_status_v2;
    
    // Special handling for finished inspection to make it very clear
    if (c.case_status_v2 === 'منتهي فحص') {
      status = 'فحص منتهي';
    }

    if (c.case_status_detail) {
      status += ` - ${c.case_status_detail}`;
      
      // If it's "حفظ", try to find the archive type from inspection details
      if (c.case_status_detail === 'حفظ' && c.inspection?.details) {
        let details = c.inspection.details;
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch (e) {
            details = null;
          }
        }
        
        if (details && details.members && Array.isArray(details.members)) {
          const memberWithArchiveType = details.members.find((m: any) => m.archive_type);
          if (memberWithArchiveType?.archive_type) {
            status += ` (${memberWithArchiveType.archive_type})`;
          }
        }
      }
    }
    return status;
  }
  
  if (c.status === 'finished') {
    const stageName = STAGE_TRANSLATIONS[c.current_stage] || c.current_stage;
    return `منتهي (${stageName})`;
  }
  if (c.status === 'draft') {
    const stageName = STAGE_TRANSLATIONS[c.current_stage] || c.current_stage;
    return `مسودة (${stageName})`;
  }
  return STATUS_TRANSLATIONS[c.status] || c.status;
};
