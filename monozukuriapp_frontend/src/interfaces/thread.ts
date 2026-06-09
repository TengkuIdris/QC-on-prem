export interface Thread {
  thread_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  parent_id: any;
  children_count: number;
  owner: Owner;
  problem: Problem;
}

export interface Owner {
  id: number;
  name: string;
  email: string;
  full_name: string;
}

export interface Problem {
  title: string;
  process: string;
  language: string;
  location: string;
  severity: string;
  frequency: string;
  description: string;
  man_details: string;
  defect_types: string[];
  direct_cause: string;
  product_name: string;
  verification: Verification;
  investigations: any[];
  method_details: string;
  machine_details: string;
  occurrence_date: string;
  material_details: string;
  other_defect_type: any;
  timeline_analysis: string;
  environment_details: string;
  measurement_details: string;
  frequency_percentage: string;
}

export interface Verification {
  date: string;
  method: string;
  result: string;
  verifier: string;
}
