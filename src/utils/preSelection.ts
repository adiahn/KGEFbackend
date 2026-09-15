// Grades that clear the KGEF pre-selection bar. Applicants with any other
// grade are auto-disqualified on submission (see applicant.controller.ts) so
// admins only need to review the pre-selected pool.
export const QUALIFYING_GRADES = ["First Class", "Distinction", "Second Class Upper"];

export function isQualifyingGrade(grade: string): boolean {
  return QUALIFYING_GRADES.includes(grade);
}

export const DISQUALIFICATION_REASON =
  "Applications were pre-selected for further review based on academic grade classification. " +
  "KGEF gave priority to applicants with a First Class, Distinction, or Second Class Upper result. " +
  "Your submitted grade did not meet this threshold, so your application was not shortlisted for the review stage.";
