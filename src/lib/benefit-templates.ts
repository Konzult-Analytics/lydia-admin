// Standard attributes for each benefit type. Used by the edit modals to
// surface "missing" attributes a reviewer can quick-add. Adjust freely —
// these are suggestions, not validation.

export interface AttributeTemplate {
  attribute_name: string;
  attribute_unit: string | null;
  example?: string;
}

const COMMON_LIFE: AttributeTemplate[] = [
  { attribute_name: "Minimum Cover", attribute_unit: "ZAR", example: "R50,000" },
  { attribute_name: "Maximum Cover", attribute_unit: "ZAR", example: "R20,000,000" },
  { attribute_name: "Minimum Entry Age", attribute_unit: "years", example: "18" },
  { attribute_name: "Maximum Entry Age", attribute_unit: "years", example: "65" },
  { attribute_name: "Cover Term", attribute_unit: "years", example: "Whole of life" },
  { attribute_name: "Premium Pattern", attribute_unit: null, example: "Age-rated / Level" },
];

const COMMON_DISABILITY: AttributeTemplate[] = [
  { attribute_name: "Waiting Period", attribute_unit: "days", example: "7 / 14 / 28" },
  { attribute_name: "Benefit Term", attribute_unit: "years", example: "To age 65" },
  { attribute_name: "Maximum Benefit", attribute_unit: "ZAR", example: "R100,000 p/m" },
  { attribute_name: "Replacement Ratio", attribute_unit: "%", example: "75%" },
];

export const BENEFIT_TYPE_TEMPLATES: Record<string, AttributeTemplate[]> = {
  LIFE_COVER: COMMON_LIFE,

  TERM_ILL: [
    { attribute_name: "Survival Period", attribute_unit: "days", example: "14" },
    { attribute_name: "Payout Percent", attribute_unit: "%", example: "100% of life cover" },
    ...COMMON_LIFE.slice(0, 2),
  ],

  FUNERAL_ADVANCE: [
    { attribute_name: "Advance Amount", attribute_unit: "ZAR", example: "R30,000" },
    { attribute_name: "Payout Time", attribute_unit: "hours", example: "48 hours" },
  ],

  LUMP_SUM_DISAB: [
    ...COMMON_DISABILITY.slice(0, 1),
    { attribute_name: "Minimum Cover", attribute_unit: "ZAR", example: "R100,000" },
    { attribute_name: "Maximum Cover", attribute_unit: "ZAR", example: "R10,000,000" },
    { attribute_name: "Definition", attribute_unit: null, example: "Own occupation / Functional" },
  ],

  FUNC_IMPAIR: [
    { attribute_name: "Tier Levels", attribute_unit: null, example: "25%, 50%, 75%, 100%" },
    { attribute_name: "Maximum Cover", attribute_unit: "ZAR" },
  ],

  INCOME_DISAB: COMMON_DISABILITY,

  SEVERE_ILL: [
    { attribute_name: "Conditions Covered", attribute_unit: null, example: "List of conditions" },
    { attribute_name: "Tier Levels", attribute_unit: null, example: "25%, 50%, 75%, 100%" },
    { attribute_name: "Survival Period", attribute_unit: "days", example: "14" },
    { attribute_name: "Reinstatement", attribute_unit: null, example: "Allowed after 12 months" },
    { attribute_name: "Maximum Cover", attribute_unit: "ZAR" },
  ],

  CANCER_COVER: [
    { attribute_name: "Stages Covered", attribute_unit: null, example: "Early / Intermediate / Severe" },
    { attribute_name: "Tier Payouts", attribute_unit: "%" },
    { attribute_name: "Maximum Cover", attribute_unit: "ZAR" },
  ],

  HEART_COVER: [
    { attribute_name: "Conditions Covered", attribute_unit: null },
    { attribute_name: "Tier Payouts", attribute_unit: "%" },
    { attribute_name: "Maximum Cover", attribute_unit: "ZAR" },
  ],

  INCOME_PROT: COMMON_DISABILITY,

  TEMP_INCOME: [
    { attribute_name: "Waiting Period", attribute_unit: "days", example: "7" },
    { attribute_name: "Maximum Period", attribute_unit: "months", example: "24" },
    { attribute_name: "Maximum Benefit", attribute_unit: "ZAR" },
  ],

  PREMIUM_WAIVER: [
    { attribute_name: "Trigger Event", attribute_unit: null, example: "Disability / Severe illness" },
    { attribute_name: "Waiting Period", attribute_unit: "days" },
    { attribute_name: "Waiver Period", attribute_unit: null, example: "Until recovery / End of policy" },
  ],

  RETRENCHMENT: [
    { attribute_name: "Maximum Period", attribute_unit: "months", example: "6" },
    { attribute_name: "Waiting Period", attribute_unit: "months", example: "3" },
    { attribute_name: "Maximum Benefit", attribute_unit: "ZAR" },
  ],

  CHILD_COVER: [
    { attribute_name: "Cover Per Child", attribute_unit: "ZAR" },
    { attribute_name: "Maximum Children", attribute_unit: null, example: "Up to 4" },
    { attribute_name: "Maximum Age", attribute_unit: "years", example: "21" },
  ],

  EDUCATION: [
    { attribute_name: "Annual Benefit", attribute_unit: "ZAR" },
    { attribute_name: "Maximum Years", attribute_unit: "years" },
    { attribute_name: "Eligible Institutions", attribute_unit: null },
  ],

  ACCIDENTAL_DEATH: [
    { attribute_name: "Cover Amount", attribute_unit: "ZAR" },
    { attribute_name: "Definition", attribute_unit: null, example: "Sudden, violent, external" },
  ],

  OTHER: [],
};

export function getTemplateFor(benefitTypeId: string | null | undefined): AttributeTemplate[] {
  if (!benefitTypeId) return [];
  return BENEFIT_TYPE_TEMPLATES[benefitTypeId] ?? [];
}

export function getMissingTemplateAttributes(
  benefitTypeId: string | null | undefined,
  existing: { attribute_name: string }[]
): AttributeTemplate[] {
  const template = getTemplateFor(benefitTypeId);
  if (template.length === 0) return [];
  const existingNames = new Set(
    existing.map((a) => a.attribute_name.toLowerCase().trim())
  );
  return template.filter((t) => !existingNames.has(t.attribute_name.toLowerCase().trim()));
}
