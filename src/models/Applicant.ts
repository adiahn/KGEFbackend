import { Schema, model, Document } from "mongoose";

export interface IApplicant extends Document {
  applicationNumber: string;

  // A. Applicant Bio-Data & Eligibility Verification
  fullName: string;
  gender: "Male" | "Female" | "Prefer not to say";
  dateOfBirth: Date;
  age: number;
  disabilityStatus: "Yes" | "No";
  disabilityDetails?: string;
  lgaOfOrigin: string;
  phone: string;
  email: string;
  address: string;
  institution: string;
  program: string;
  graduationYear: number;
  certificateAvailable: "Yes" | "No";
  educationalQualification: "Degree" | "NCE" | "Diploma" | "Other";
  educationalQualificationOther?: string;
  studentIdNumber?: string;
  nin: string;
  bvn: string;
  cacCertificateNumber?: string;

  documents: {
    universityCertificate?: string;
    kasedaCertificate?: string;
    cacCertificate?: string;
    tinCertificate?: string;
    lgaIndigeneLetter?: string;
  };

  // B. Business Concept & Market Analysis
  businessSector:
    | "Agribusiness (crop farming, livestock, fisheries)"
    | "Trade & Retail (wholesale, retail, e-commerce)"
    | "Services (consulting, education, maintenance)"
    | "Tech & Creative (software, digital services, media)"
    | "Manufacturing & Processing"
    | "Food & Hospitality";
  businessStage:
    | "Idea only (not yet started)"
    | "Planning stage (business plan complete)"
    | "Early operations (<6 months)"
    | "Established (>6 months)";
  targetMarketType:
    | "Individual consumers (B2C)"
    | "Businesses (B2B)"
    | "Government/Institutions (B2G)"
    | "Mixed market";
  competitionLevel:
    | "No direct competition"
    | "Low competition (1-2 competitors)"
    | "Moderate competition (3-5 competitors)"
    | "High competition (6+ competitors)";
  legalStructure:
    | "Sole proprietorship"
    | "Partnership"
    | "Registered business name"
    | "Limited liability company";

  // C. Capital Requirements Assessment
  totalCapitalNeeded:
    | "₦100,000 - ₦200,000"
    | "₦200,001 - ₦300,000"
    | "₦300,001 - ₦400,000"
    | "₦400,001 - ₦500,000"
    | "Above ₦500,000";
  largestCapitalCategory:
    | "Equipment & machinery"
    | "Inventory & raw materials"
    | "Rent & workspace setup"
    | "Working capital (operational expenses)"
    | "Licenses & registrations";
  personalContribution:
    | "₦0 - ₦50,000"
    | "₦50,001 - ₦100,000"
    | "₦100,001 - ₦200,000"
    | "Above ₦200,000";
  existingAssets:
    | "None"
    | "Basic tools/equipment"
    | "Vehicle/transport"
    | "Workspace/land"
    | "Multiple assets";
  contingencyPlanning:
    | "No contingency planned"
    | "5% of total capital"
    | "10% of total capital"
    | "15%+ of total capital";

  // D. KGEF Funding Request
  requestedAmount:
    | "₦100,000 (Base loan tier)"
    | "₦200,000"
    | "₦300,000"
    | "₦400,000"
    | "₦500,000"
    | "Above ₦500,000";
  preferredFundingType:
    | "Seed grant only"
    | "Soft loan only"
    | "Combination of both"
    | "Undecided";
  disbursementPreference:
    | "100% upfront"
    | "70% upfront, 30% after 3 months"
    | "50% upfront, 50% after 6 months"
    | "Phased based on milestones";

  // F. Applicant Capacity
  workExperience:
    | "No relevant experience"
    | "1-2 years in related field"
    | "3-5 years in related field"
    | "5+ years in related field";
  entrepreneurshipTraining:
    | "No formal training"
    | "School entrepreneurship course"
    | "Short workshop/certificate"
    | "Extensive training program";
  timeCommitment:
    | "Part-time (less than 20 hours/week)"
    | "Full-time transition (currently employed)"
    | "Full-time immediate"
    | "Will hire manager";
  financialManagementSkill:
    | "Basic (personal budgeting only)"
    | "Intermediate (can manage business accounts)"
    | "Advanced (financial analysis capability)"
    | "Professional (accounting/finance background)";
  supportNetwork:
    | "No support network"
    | "Family support only"
    | "Mentor/advisor available"
    | "Professional network"
    | "Comprehensive support system";

  // G. Guarantor Arrangements
  guarantorType:
    | "No guarantor available"
    | "Civil servant (level 8-12)"
    | "Civil servant (level 13+)"
    | "Registered business owner"
    | "Multiple guarantors";
  guarantorRelationship:
    | "Immediate family member"
    | "Extended family member"
    | "Friend/colleague"
    | "Professional contact"
    | "Other relationship";

  // H. Program Participation
  trainingFormatPreference:
    | "Fully physical"
    | "Fully online"
    | "Hybrid (physical + online)"
    | "Flexible/any format";
  peerGroupWillingness:
    | "Willing and enthusiastic"
    | "Willing but hesitant"
    | "Prefer not to join"
    | "Strongly opposed";
  monitoringComfortLevel:
    | "Very comfortable (welcome regular visits)"
    | "Comfortable (quarterly visits okay)"
    | "Somewhat comfortable (prefer minimal visits)"
    | "Uncomfortable with monitoring";

  // I. Business Impact Expectations
  expectedJobCreation:
    | "Self-employment only"
    | "1-2 additional employees"
    | "3-5 additional employees"
    | "6+ additional employees";
  expectedMonthlyRevenue:
    | "Less than ₦100,000"
    | "₦100,000 - ₦250,000"
    | "₦250,001 - ₦500,000"
    | "Above ₦500,000";

  // Application meta
  status: "pending" | "under_review" | "approved" | "rejected";
  score?: number;
  reviewNotes?: string;
  decisionReason?: string;
  documentVerification?: {
    universityCertificate?: boolean;
    kasedaCertificate?: boolean;
    cacCertificate?: boolean;
    tinCertificate?: boolean;
    lgaIndigeneLetter?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const applicantSchema = new Schema<IApplicant>(
  {
    applicationNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female", "Prefer not to say"], required: true },
    dateOfBirth: { type: Date, required: true },
    age: { type: Number, required: true, min: 0 },
    disabilityStatus: { type: String, enum: ["Yes", "No"], required: true },
    disabilityDetails: { type: String, trim: true },
    lgaOfOrigin: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    graduationYear: { type: Number, required: true },
    certificateAvailable: { type: String, enum: ["Yes", "No"], required: true },
    educationalQualification: {
      type: String,
      enum: ["Degree", "NCE", "Diploma", "Other"],
      required: true,
    },
    educationalQualificationOther: { type: String, trim: true },
    studentIdNumber: { type: String, trim: true },
    nin: { type: String, required: true, trim: true },
    bvn: { type: String, required: true, trim: true },
    cacCertificateNumber: { type: String, trim: true },

    documents: {
      universityCertificate: { type: String },
      kasedaCertificate: { type: String },
      cacCertificate: { type: String },
      tinCertificate: { type: String },
      lgaIndigeneLetter: { type: String },
    },

    businessSector: {
      type: String,
      enum: [
        "Agribusiness (crop farming, livestock, fisheries)",
        "Trade & Retail (wholesale, retail, e-commerce)",
        "Services (consulting, education, maintenance)",
        "Tech & Creative (software, digital services, media)",
        "Manufacturing & Processing",
        "Food & Hospitality",
      ],
      required: true,
    },
    businessStage: {
      type: String,
      enum: [
        "Idea only (not yet started)",
        "Planning stage (business plan complete)",
        "Early operations (<6 months)",
        "Established (>6 months)",
      ],
      required: true,
    },
    targetMarketType: {
      type: String,
      enum: [
        "Individual consumers (B2C)",
        "Businesses (B2B)",
        "Government/Institutions (B2G)",
        "Mixed market",
      ],
      required: true,
    },
    competitionLevel: {
      type: String,
      enum: [
        "No direct competition",
        "Low competition (1-2 competitors)",
        "Moderate competition (3-5 competitors)",
        "High competition (6+ competitors)",
      ],
      required: true,
    },
    legalStructure: {
      type: String,
      enum: [
        "Sole proprietorship",
        "Partnership",
        "Registered business name",
        "Limited liability company",
      ],
      required: true,
    },

    totalCapitalNeeded: {
      type: String,
      enum: [
        "₦100,000 - ₦200,000",
        "₦200,001 - ₦300,000",
        "₦300,001 - ₦400,000",
        "₦400,001 - ₦500,000",
        "Above ₦500,000",
      ],
      required: true,
    },
    largestCapitalCategory: {
      type: String,
      enum: [
        "Equipment & machinery",
        "Inventory & raw materials",
        "Rent & workspace setup",
        "Working capital (operational expenses)",
        "Licenses & registrations",
      ],
      required: true,
    },
    personalContribution: {
      type: String,
      enum: ["₦0 - ₦50,000", "₦50,001 - ₦100,000", "₦100,001 - ₦200,000", "Above ₦200,000"],
      required: true,
    },
    existingAssets: {
      type: String,
      enum: ["None", "Basic tools/equipment", "Vehicle/transport", "Workspace/land", "Multiple assets"],
      required: true,
    },
    contingencyPlanning: {
      type: String,
      enum: [
        "No contingency planned",
        "5% of total capital",
        "10% of total capital",
        "15%+ of total capital",
      ],
      required: true,
    },

    requestedAmount: {
      type: String,
      enum: [
        "₦100,000 (Base loan tier)",
        "₦200,000",
        "₦300,000",
        "₦400,000",
        "₦500,000",
        "Above ₦500,000",
      ],
      required: true,
    },
    preferredFundingType: {
      type: String,
      enum: ["Seed grant only", "Soft loan only", "Combination of both", "Undecided"],
      required: true,
    },
    disbursementPreference: {
      type: String,
      enum: [
        "100% upfront",
        "70% upfront, 30% after 3 months",
        "50% upfront, 50% after 6 months",
        "Phased based on milestones",
      ],
      required: true,
    },

    workExperience: {
      type: String,
      enum: [
        "No relevant experience",
        "1-2 years in related field",
        "3-5 years in related field",
        "5+ years in related field",
      ],
      required: true,
    },
    entrepreneurshipTraining: {
      type: String,
      enum: [
        "No formal training",
        "School entrepreneurship course",
        "Short workshop/certificate",
        "Extensive training program",
      ],
      required: true,
    },
    timeCommitment: {
      type: String,
      enum: [
        "Part-time (less than 20 hours/week)",
        "Full-time transition (currently employed)",
        "Full-time immediate",
        "Will hire manager",
      ],
      required: true,
    },
    financialManagementSkill: {
      type: String,
      enum: [
        "Basic (personal budgeting only)",
        "Intermediate (can manage business accounts)",
        "Advanced (financial analysis capability)",
        "Professional (accounting/finance background)",
      ],
      required: true,
    },
    supportNetwork: {
      type: String,
      enum: [
        "No support network",
        "Family support only",
        "Mentor/advisor available",
        "Professional network",
        "Comprehensive support system",
      ],
      required: true,
    },

    guarantorType: {
      type: String,
      enum: [
        "No guarantor available",
        "Civil servant (level 8-12)",
        "Civil servant (level 13+)",
        "Registered business owner",
        "Multiple guarantors",
      ],
      required: true,
    },
    guarantorRelationship: {
      type: String,
      enum: [
        "Immediate family member",
        "Extended family member",
        "Friend/colleague",
        "Professional contact",
        "Other relationship",
      ],
      required: true,
    },

    trainingFormatPreference: {
      type: String,
      enum: ["Fully physical", "Fully online", "Hybrid (physical + online)", "Flexible/any format"],
      required: true,
    },
    peerGroupWillingness: {
      type: String,
      enum: [
        "Willing and enthusiastic",
        "Willing but hesitant",
        "Prefer not to join",
        "Strongly opposed",
      ],
      required: true,
    },
    monitoringComfortLevel: {
      type: String,
      enum: [
        "Very comfortable (welcome regular visits)",
        "Comfortable (quarterly visits okay)",
        "Somewhat comfortable (prefer minimal visits)",
        "Uncomfortable with monitoring",
      ],
      required: true,
    },

    expectedJobCreation: {
      type: String,
      enum: [
        "Self-employment only",
        "1-2 additional employees",
        "3-5 additional employees",
        "6+ additional employees",
      ],
      required: true,
    },
    expectedMonthlyRevenue: {
      type: String,
      enum: ["Less than ₦100,000", "₦100,000 - ₦250,000", "₦250,001 - ₦500,000", "Above ₦500,000"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    score: { type: Number },
    reviewNotes: { type: String, trim: true },
    decisionReason: { type: String, trim: true },
    documentVerification: {
      universityCertificate: { type: Boolean, default: false },
      kasedaCertificate: { type: Boolean, default: false },
      cacCertificate: { type: Boolean, default: false },
      tinCertificate: { type: Boolean, default: false },
      lgaIndigeneLetter: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Applicant = model<IApplicant>("Applicant", applicantSchema);
