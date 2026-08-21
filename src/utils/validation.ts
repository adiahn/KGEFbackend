import { z } from "zod";

const documentsSchema = z
  .object({
    universityCertificate: z.string().url().optional(),
    kasedaCertificate: z.string().url().optional(),
    cacCertificate: z.string().url().optional(),
    cacStatusReport: z.string().url().optional(),
    tinCertificate: z.string().url().optional(),
    lgaIndigeneLetter: z.string().url().optional(),
  })
  .optional();

export const applicantInputSchema = z.object({
  documents: documentsSchema,
  fullName: z.string().min(1),
  gender: z.enum(["Male", "Female", "Prefer not to say"]),
  dateOfBirth: z.coerce.date(),
  age: z.coerce.number().int().min(0),
  disabilityStatus: z.enum(["Yes", "No"]),
  disabilityDetails: z.string().optional(),
  lgaOfOrigin: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  institution: z.string().min(1),
  program: z.string().min(1),
  graduationYear: z.coerce.number().int(),
  certificateAvailable: z.enum(["Yes", "No"]),
  educationalQualification: z.enum(["Degree", "NCE", "Diploma", "Other"]),
  educationalQualificationOther: z.string().optional(),
  grade: z.string().min(1),
  studentIdNumber: z.string().optional(),
  nin: z.string().min(1),
  bvn: z.string().min(1),
  cacCertificateNumber: z.string().optional(),

  businessSector: z.enum([
    "Agribusiness (crop farming, livestock, fisheries)",
    "Trade & Retail (wholesale, retail, e-commerce)",
    "Services (consulting, education, maintenance)",
    "Tech & Creative (software, digital services, media)",
    "Manufacturing & Processing",
    "Food & Hospitality",
  ]),
  businessStage: z.enum([
    "Idea only (not yet started)",
    "Planning stage (business plan complete)",
    "Early operations (<6 months)",
    "Established (>6 months)",
  ]),
  targetMarketType: z.enum([
    "Individual consumers (B2C)",
    "Businesses (B2B)",
    "Government/Institutions (B2G)",
    "Mixed market",
  ]),
  competitionLevel: z.enum([
    "No direct competition",
    "Low competition (1-2 competitors)",
    "Moderate competition (3-5 competitors)",
    "High competition (6+ competitors)",
  ]),
  legalStructure: z.enum([
    "Sole proprietorship",
    "Partnership",
    "Registered business name",
    "Limited liability company",
  ]),

  totalCapitalNeeded: z.enum([
    "₦100,000 - ₦200,000",
    "₦200,001 - ₦300,000",
    "₦300,001 - ₦400,000",
    "₦400,001 - ₦500,000",
    "Above ₦500,000",
  ]),
  largestCapitalCategory: z.enum([
    "Equipment & machinery",
    "Inventory & raw materials",
    "Rent & workspace setup",
    "Working capital (operational expenses)",
    "Licenses & registrations",
  ]),
  personalContribution: z.enum([
    "₦0 - ₦50,000",
    "₦50,001 - ₦100,000",
    "₦100,001 - ₦200,000",
    "Above ₦200,000",
  ]),
  existingAssets: z.enum([
    "None",
    "Basic tools/equipment",
    "Vehicle/transport",
    "Workspace/land",
    "Multiple assets",
  ]),
  contingencyPlanning: z.enum([
    "No contingency planned",
    "5% of total capital",
    "10% of total capital",
    "15%+ of total capital",
  ]),

  requestedAmount: z.enum([
    "₦100,000 (Base loan tier)",
    "₦200,000",
    "₦300,000",
    "₦400,000",
    "₦500,000",
    "Above ₦500,000",
  ]),
  disbursementPreference: z.enum([
    "100% upfront",
    "70% upfront, 30% after 3 months",
    "50% upfront, 50% after 6 months",
    "Phased based on milestones",
  ]),

  workExperience: z.enum(["Yes", "No"]),
  employerName: z.string().optional(),
  employerPosition: z.string().optional(),
  workExperienceYears: z.coerce.number().int().min(0).optional(),
  entrepreneurshipTraining: z.enum([
    "No formal training",
    "School entrepreneurship course",
    "Short workshop/certificate",
    "Extensive training program",
  ]),
  timeCommitment: z.enum([
    "Part-time (less than 20 hours/week)",
    "Full-time transition (currently employed)",
    "Full-time immediate",
    "Will hire manager",
  ]),
  financialManagementSkill: z.enum([
    "Basic (personal budgeting only)",
    "Intermediate (can manage business accounts)",
    "Advanced (financial analysis capability)",
    "Professional (accounting/finance background)",
  ]),
  supportNetwork: z.enum([
    "No support network",
    "Family support only",
    "Mentor/advisor available",
    "Professional network",
    "Comprehensive support system",
  ]),

  guarantorType: z.enum([
    "No guarantor available",
    "Civil servant (level 8-12)",
    "Civil servant (level 13+)",
    "Registered business owner",
    "Multiple guarantors",
  ]),
  guarantorRelationship: z.enum([
    "Immediate family member",
    "Extended family member",
    "Friend/colleague",
    "Professional contact",
    "Other relationship",
  ]),

  trainingFormatPreference: z.enum([
    "Fully physical",
    "Fully online",
    "Hybrid (physical + online)",
    "Flexible/any format",
  ]),
  peerGroupWillingness: z.enum([
    "Willing and enthusiastic",
    "Willing but hesitant",
    "Prefer not to join",
    "Strongly opposed",
  ]),
  monitoringComfortLevel: z.enum([
    "Very comfortable (welcome regular visits)",
    "Comfortable (quarterly visits okay)",
    "Somewhat comfortable (prefer minimal visits)",
    "Uncomfortable with monitoring",
  ]),

  expectedJobCreation: z.enum([
    "Self-employment only",
    "1-2 additional employees",
    "3-5 additional employees",
    "6+ additional employees",
  ]),
  expectedMonthlyRevenue: z.enum([
    "Less than ₦100,000",
    "₦100,000 - ₦250,000",
    "₦250,001 - ₦500,000",
    "Above ₦500,000",
  ]),
});

export type ApplicantInput = z.infer<typeof applicantInputSchema>;
