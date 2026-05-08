// ============================================
// RentMyWay — Database Types
// ============================================

export type UserRole = 'broker' | 'owner' | 'tenant';

export type PropertyStatus = 'draft' | 'available' | 'rented';
export type PropertyType = '1bhk' | '2bhk' | '3bhk' | '4bhk' | 'studio' | 'villa' | 'independent_house' | 'pg';
export type FurnishingType = 'unfurnished' | 'semi_furnished' | 'fully_furnished';
export type PreferredTenant = 'family' | 'bachelor' | 'company' | 'any';

export type LeadStatus = 'new' | 'contacted' | 'site_visit_scheduled' | 'site_visit_done' | 'negotiation' | 'token_paid' | 'converted' | 'lost';
export type LeadSource = 'walkin' | '99acres' | 'magicbricks' | 'housing' | 'olx' | 'referral' | 'social_media' | 'other';

export type FollowUpType = 'call' | 'whatsapp' | 'email' | 'site_visit' | 'meeting' | 'other';

export type DocumentType = 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'rent_agreement' | 'other';

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintCategory = 'plumbing' | 'electrical' | 'carpentry' | 'painting' | 'pest_control' | 'appliance' | 'structural' | 'cleaning' | 'security' | 'other';

export type UtilityCondition = 'working' | 'not_working' | 'needs_repair';

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'waived';

export type LeaseStatus = 'draft' | 'active' | 'expiring' | 'expired' | 'renewed' | 'terminated';

export type BillType = 'electricity' | 'water' | 'gas' | 'internet' | 'maintenance' | 'society' | 'other';
export type BillStatus = 'pending' | 'paid' | 'overdue';
export type BillPaidBy = 'tenant' | 'owner' | 'broker';

export type PayoutStatus = 'pending' | 'paid';

export type NotificationType =
  | 'rent_due' | 'rent_overdue' | 'rent_paid'
  | 'complaint_created' | 'complaint_updated' | 'complaint_resolved'
  | 'lease_expiring' | 'lease_renewed' | 'lease_created'
  | 'maintenance_scheduled' | 'maintenance_completed'
  | 'announcement' | 'document_uploaded' | 'move_out' | 'general';

// ============================================
// Table Row Types
// ============================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  profile_id: string | null;
  broker_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  broker_id: string;
  owner_id: string;
  title: string;
  status: PropertyStatus;
  property_type: PropertyType;
  furnishing: FurnishingType;
  rent: number;
  deposit: number;
  maintenance_charge: number;
  locality: string;
  city: string;
  state: string;
  address: string;
  pincode: string | null;
  floor_number: number | null;
  total_floors: number | null;
  area_sqft: number | null;
  facing: string | null;
  parking: boolean;
  pet_friendly: boolean;
  non_veg_allowed: boolean;
  bachelor_allowed: boolean;
  preferred_tenant: PreferredTenant | null;
  description: string | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Owner;
  tenant?: Tenant | null;
}

export interface Lead {
  id: string;
  broker_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource | null;
  status: LeadStatus;
  budget_min: number | null;
  budget_max: number | null;
  preferred_locality: string | null;
  preferred_city: string | null;
  preferred_type: string | null;
  preferred_furnishing: string | null;
  move_in_date: string | null;
  notes: string | null;
  images: string[] | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadPropertyMatch {
  id: string;
  lead_id: string;
  property_id: string;
  shared_at: string | null;
  feedback: string | null;
  created_at: string;
  property?: Property;
}

export interface LeadFollowUp {
  id: string;
  lead_id: string;
  broker_id: string;
  type: FollowUpType;
  notes: string | null;
  follow_up_date: string | null;
  completed: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  profile_id: string | null;
  broker_id: string;
  lead_id: string | null;
  property_id: string;
  name: string;
  phone: string;
  email: string | null;
  rent_amount: number;
  deposit_amount: number;
  move_in_date: string;
  lease_end_date: string | null;
  is_active: boolean;
  kyc_token: string | null;
  kyc_token_expiry: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  property?: Property;
  documents?: Document[];
}

export interface Document {
  id: string;
  tenant_id: string;
  doc_type: DocumentType;
  file_url: string;
  file_name: string | null;
  uploaded_at: string;
}

export interface Utility {
  id: string;
  property_id: string;
  name: string;
  location: string | null;
  count: number;
  condition: UtilityCondition;
  created_at: string;
}

export interface Complaint {
  id: string;
  tenant_id: string;
  property_id: string;
  utility_id: string | null;
  broker_id: string;
  title: string;
  description: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: ComplaintCategory | null;
  assigned_to: string | null;
  assigned_phone: string | null;
  scheduled_date: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  resolution_images: string[] | null;
  cost: number | null;
  images: string[] | null;
  tenant_rating: number | null;
  tenant_feedback: string | null;
  sla_response_hours: number;
  sla_resolution_hours: number;
  created_at: string;
  updated_at: string;
  // Joined
  tenant?: Tenant;
  property?: Property;
  utility?: Utility;
}

export interface RentPayment {
  id: string;
  tenant_id: string;
  property_id: string;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode | null;
  month_year: string;
  notes: string | null;
  receipt_number: string | null;
  late_fee: number;
  status: PaymentStatus;
  due_date: string | null;
  broker_id: string | null;
  created_at: string;
  // Joined
  tenant?: Tenant;
  property?: Property;
}

export interface LeaseAgreement {
  id: string;
  tenant_id: string;
  property_id: string;
  broker_id: string;
  start_date: string;
  end_date: string;
  lock_in_months: number;
  notice_period_days: number;
  monthly_rent: number;
  security_deposit: number;
  maintenance_charge: number;
  escalation_percent: number;
  escalation_frequency_months: number;
  status: LeaseStatus;
  renewed_from_id: string | null;
  renewal_notes: string | null;
  agreement_url: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  tenant?: Tenant;
  property?: Property;
}

export interface RentScheduleItem {
  id: string;
  tenant_id: string;
  property_id: string;
  lease_id: string | null;
  broker_id: string;
  month_year: string;
  expected_amount: number;
  due_date: string;
  status: PaymentStatus;
  payment_id: string | null;
  created_at: string;
  // Joined
  tenant?: Tenant;
  property?: Property;
  payment?: RentPayment;
}

export interface OwnerPayout {
  id: string;
  owner_id: string;
  property_id: string;
  broker_id: string;
  amount: number;
  for_month: string;
  payment_date: string | null;
  payment_mode: PaymentMode | null;
  status: PayoutStatus;
  notes: string | null;
  created_at: string;
  // Joined
  owner?: Owner;
  property?: Property;
}

export interface UtilityBill {
  id: string;
  property_id: string;
  tenant_id: string | null;
  broker_id: string;
  bill_type: BillType;
  amount: number;
  bill_date: string;
  due_date: string | null;
  bill_month: string;
  status: BillStatus;
  paid_by: BillPaidBy | null;
  bill_image_url: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  property?: Property;
  tenant?: Tenant;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  broker_id: string;
  title: string;
  message: string;
  target_role: 'all' | 'tenant' | 'owner' | null;
  target_property_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BrokerCommission {
  id: string;
  broker_id: string;
  tenant_id: string;
  property_id: string;
  owner_id: string;
  commission_type: 'percentage' | 'fixed' | 'one_month_rent';
  commission_value: number;
  computed_amount: number;
  status: 'pending' | 'invoiced' | 'received' | 'partial';
  received_amount: number;
  received_date: string | null;
  deal_date: string;
  notes: string | null;
  created_at: string;
}

export interface BrokerExpense {
  id: string;
  broker_id: string;
  category: 'marketing' | 'advertising' | 'travel' | 'office' | 'phone' | 'internet' | 'software' | 'printing' | 'legal' | 'staff_salary' | 'other';
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  created_at: string;
}

export type MaintenanceFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';

export interface MaintenanceSchedule {
  id: string;
  property_id: string;
  broker_id: string;
  title: string;
  description: string | null;
  category: ComplaintCategory | null;
  frequency: MaintenanceFrequency;
  custom_days: number | null;
  last_completed: string | null;
  next_due: string;
  estimated_cost: number | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  is_active: boolean;
  created_at: string;
  // Joined
  property?: Property;
}

export type OwnerExpenseCategory = 
  | 'property_tax' | 'insurance' | 'loan_emi' | 'society_charges'
  | 'renovation' | 'legal' | 'registration' | 'brokerage' | 'other';

export interface OwnerExpense {
  id: string;
  owner_id: string;
  property_id: string | null;
  broker_id: string;
  category: OwnerExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_frequency: 'monthly' | 'quarterly' | 'yearly' | null;
  created_at: string;
  // Joined
  owner?: Owner;
  property?: Property;
}

export type OwnerDocumentType = 
  | 'sale_deed' | 'property_tax_receipt' | 'insurance_policy'
  | 'society_noc' | 'encumbrance_certificate' | 'index_ii'
  | '7_12_extract' | 'building_plan' | 'completion_certificate' | 'other';

export interface OwnerDocument {
  id: string;
  owner_id: string;
  property_id: string | null;
  doc_type: OwnerDocumentType;
  file_url: string;
  file_name: string | null;
  expiry_date: string | null;
  uploaded_at: string;
  // Joined
  owner?: Owner;
  property?: Property;
}

export type MoveOutStatus = 'pending' | 'approved' | 'inspection_scheduled' | 'completed' | 'cancelled';

export interface MoveOutRequest {
  id: string;
  tenant_id: string;
  property_id: string;
  broker_id: string;
  requested_date: string;
  notice_served_date: string;
  keys_returned: boolean;
  property_inspected: boolean;
  dues_cleared: boolean;
  deposit_refunded: boolean;
  deposit_refund_amount: number | null;
  deductions: number;
  deduction_reason: string | null;
  status: MoveOutStatus;
  broker_notes: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export interface EmergencyContact {
  id: string;
  property_id: string;
  broker_id: string;
  name: string;
  role: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  // Joined
  property?: Property;
}



// ============================================
// Insert / Update Types
// ============================================

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at' | 'owner' | 'tenant'>;
export type PropertyUpdate = Partial<PropertyInsert>;

export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
export type LeadUpdate = Partial<LeadInsert>;

export type TenantInsert = Omit<Tenant, 'id' | 'created_at' | 'updated_at' | 'property' | 'documents'>;
export type TenantUpdate = Partial<TenantInsert>;

export type UtilityInsert = Omit<Utility, 'id' | 'created_at'>;
export type UtilityUpdate = Partial<UtilityInsert>;

export type RentPaymentInsert = Omit<RentPayment, 'id' | 'created_at' | 'tenant' | 'property' | 'receipt_number' | 'late_fee' | 'status' | 'due_date' | 'broker_id'> & {
  receipt_number?: string | null;
  late_fee?: number;
  status?: PaymentStatus;
  due_date?: string | null;
  broker_id?: string | null;
};

export type LeaseAgreementInsert = Omit<LeaseAgreement, 'id' | 'created_at' | 'updated_at' | 'tenant' | 'property'>;
export type LeaseAgreementUpdate = Partial<LeaseAgreementInsert>;

export type RentScheduleInsert = Omit<RentScheduleItem, 'id' | 'created_at' | 'tenant' | 'property' | 'payment'>;

export type OwnerPayoutInsert = Omit<OwnerPayout, 'id' | 'created_at' | 'owner' | 'property'>;

export type UtilityBillInsert = Omit<UtilityBill, 'id' | 'created_at' | 'property' | 'tenant'>;
export type UtilityBillUpdate = Partial<UtilityBillInsert>;

export type ComplaintInsert = Omit<Complaint, 
  'id' | 'created_at' | 'updated_at' | 'tenant' | 'property' | 'utility' | 
  'category' | 'assigned_to' | 'assigned_phone' | 'scheduled_date' | 
  'resolved_at' | 'resolution_notes' | 'resolution_images' | 'cost' | 
  'images' | 'tenant_rating' | 'tenant_feedback' | 'sla_response_hours' | 
  'sla_resolution_hours'
> & {
  category?: ComplaintCategory | null;
  assigned_to?: string | null;
  assigned_phone?: string | null;
  scheduled_date?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  resolution_images?: string[] | null;
  cost?: number | null;
  images?: string[] | null;
  tenant_rating?: number | null;
  tenant_feedback?: string | null;
  sla_response_hours?: number;
  sla_resolution_hours?: number;
};
export type ComplaintUpdate = Partial<ComplaintInsert>;

export type MaintenanceScheduleInsert = Omit<MaintenanceSchedule, 'id' | 'created_at' | 'property'>;
export type MaintenanceScheduleUpdate = Partial<MaintenanceScheduleInsert>;

export type OwnerExpenseInsert = Omit<OwnerExpense, 'id' | 'created_at' | 'owner' | 'property'>;
export type OwnerExpenseUpdate = Partial<OwnerExpenseInsert>;

export type OwnerDocumentInsert = Omit<OwnerDocument, 'id' | 'uploaded_at' | 'owner' | 'property'>;

export type MoveOutRequestInsert = Omit<MoveOutRequest, 'id' | 'created_at' | 'updated_at' | 'tenant' | 'property' | 'notice_served_date'> & {
  notice_served_date?: string;
};
export type MoveOutRequestUpdate = Partial<MoveOutRequestInsert>;

export type EmergencyContactInsert = Omit<EmergencyContact, 'id' | 'created_at' | 'property'>;
export type EmergencyContactUpdate = Partial<EmergencyContactInsert>;

export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'is_read'> & {
  is_read?: boolean;
};
export type NotificationUpdate = Partial<NotificationInsert>;

export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at'>;
export type AnnouncementUpdate = Partial<AnnouncementInsert>;

export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>;

export type BrokerCommissionInsert = Omit<BrokerCommission, 'id' | 'created_at' | 'received_amount' | 'status'> & {
  received_amount?: number;
  status?: 'pending' | 'invoiced' | 'received' | 'partial';
};
export type BrokerCommissionUpdate = Partial<BrokerCommissionInsert>;

export type BrokerExpenseInsert = Omit<BrokerExpense, 'id' | 'created_at'>;
export type BrokerExpenseUpdate = Partial<BrokerExpenseInsert>;

// ============================================
// UI Helper Types
// ============================================

export const LEAD_STAGE_ORDER: LeadStatus[] = [
  'new', 'contacted', 'site_visit_scheduled', 'site_visit_done',
  'negotiation', 'token_paid', 'converted', 'lost'
];

export const LEAD_STAGE_LABELS: Record<LeadStatus, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  site_visit_scheduled: 'Site Visit Scheduled',
  site_visit_done: 'Site Visit Done',
  negotiation: 'Negotiation',
  token_paid: 'Token Paid',
  converted: 'Converted ✅',
  lost: 'Lost ❌',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  '1bhk': '1 BHK',
  '2bhk': '2 BHK',
  '3bhk': '3 BHK',
  '4bhk': '4 BHK',
  studio: 'Studio',
  villa: 'Villa',
  independent_house: 'Independent House',
  pg: 'PG',
};

export const FURNISHING_LABELS: Record<FurnishingType, string> = {
  unfurnished: 'Unfurnished',
  semi_furnished: 'Semi-Furnished',
  fully_furnished: 'Fully Furnished',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  walkin: 'Walk-in',
  '99acres': '99acres',
  magicbricks: 'MagicBricks',
  housing: 'Housing.com',
  olx: 'OLX',
  referral: 'Referral',
  social_media: 'Social Media',
  other: 'Other',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  driving_license: 'Driving License',
  rent_agreement: 'Rent Agreement',
  other: 'Other',
};

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  expiring: 'Expiring Soon',
  expired: 'Expired',
  renewed: 'Renewed',
  terminated: 'Terminated',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  waived: 'Waived',
};

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  electricity: 'Electricity',
  water: 'Water',
  gas: 'Gas',
  internet: 'Internet',
  maintenance: 'Maintenance',
  society: 'Society Charges',
  other: 'Other',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  rent_due: 'Rent Due',
  rent_overdue: 'Rent Overdue',
  rent_paid: 'Rent Paid',
  complaint_created: 'Complaint Filed',
  complaint_updated: 'Complaint Updated',
  complaint_resolved: 'Complaint Resolved',
  lease_expiring: 'Lease Expiring',
  lease_renewed: 'Lease Renewed',
  lease_created: 'Lease Created',
  maintenance_scheduled: 'Maintenance Scheduled',
  maintenance_completed: 'Maintenance Completed',
  announcement: 'Announcement',
  document_uploaded: 'Document Uploaded',
  move_out: 'Move-out Request',
  general: 'General',
};

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  carpentry: 'Carpentry',
  painting: 'Painting',
  pest_control: 'Pest Control',
  appliance: 'Appliance Repair',
  structural: 'Structural',
  cleaning: 'Cleaning',
  security: 'Security',
  other: 'Other',
};

export const MOVE_OUT_STATUS_LABELS: Record<MoveOutStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  inspection_scheduled: 'Inspection Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
