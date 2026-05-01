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

export type UtilityCondition = 'working' | 'not_working' | 'needs_repair';

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';

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
  resolution_notes: string | null;
  cost: number | null;
  images: string[] | null;
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
  created_at: string;
  // Joined
  tenant?: Tenant;
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

export type ComplaintInsert = Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'tenant' | 'property' | 'utility'>;
export type ComplaintUpdate = Partial<ComplaintInsert>;

export type UtilityInsert = Omit<Utility, 'id' | 'created_at'>;
export type UtilityUpdate = Partial<UtilityInsert>;

export type RentPaymentInsert = Omit<RentPayment, 'id' | 'created_at' | 'tenant' | 'property'>;

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
