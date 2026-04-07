export interface Member {
  id: number;
  name: string;
  rank: string;
  prosecution_office: string;
}

export interface ProsecutionMember {
  id: number;
  serial_number?: number;
  name: string;
  grade: string;
  grade_order: number;
  seniority: number;
  governorate: string;
  police_station: string;
  prosecution_office: string;
  national_id: string;
  phone1: string;
  phone2: string;
  created_at: string;
  updated_at: string;
  total_count?: number;
}

export interface Case {
  id: number;
  incoming_number: string;
  incoming_date: string;
  complainant?: string;
  complainant_id_number?: string;
  subject: string;
  title?: string;
  case_number?: string;
  case_year?: string;
  prosecution_name?: string;
  prosecution_id?: number;
  analysis_number?: string;
  category?: string;
  complaint_category?: 'فنية' | 'مسلكية';
  decision?: 'فحص' | 'فحص وعرض';
  status: 'draft' | 'inspection' | 'investigation' | 'council' | 'finished' | 'closed';
  case_status_v2?: string;
  case_status_detail?: string;
  trial_number?: string;
  trial_year?: string;
  current_stage: 'incoming' | 'inspection' | 'investigation' | 'council';
  member?: Member;
  members?: Member[];
  member_ids?: number[];
  inspection?: Inspection;
  investigation?: Investigation;
  councils?: DisciplinaryCouncil[];
  reopen_reason?: string;
  reopened_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: number;
  case_id: number;
  inspection_number: string;
  year: string;
  referral_date: string;
  inspector_id: number;
  result: string;
  details: any;
  is_closed: number;
}

export interface Investigation {
  id: number;
  case_id: number;
  investigation_number: string;
  year: string;
  type: string;
  subject: string;
  investigator_id: number;
  referral_authority: string;
  referral_details: any;
  result: string;
  is_closed: number;
}

export interface DisciplinaryCouncil {
  id: number;
  case_id: number;
  type: string;
  details: any;
  result: string;
  is_closed: number;
}

export interface AuditLog {
  id: number;
  user_name: string;
  action: string;
  table_name: string;
  record_id: number;
  old_values: string;
  new_values: string;
  timestamp: string;
}

export interface MemberHistoryItem {
  case_id: number;
  incoming_number: string;
  incoming_date: string;
  subject: string;
  status: string;
  current_stage: string;
  decision: string;
  inspection_number?: string;
  inspection_year?: string;
  inspection_result?: string;
  investigation_number?: string;
  investigation_year?: string;
  investigation_result?: string;
  council_type?: string;
  council_result?: string;
}
