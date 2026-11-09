export type UserRole = "user" | "admin";
export type ProblemDifficulty = "Easy" | "Medium" | "Hard";
export type ProblemTypeName = "dsa" | "development" | "sql" | "bash";
export type SubmissionStatus =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Runtime Error"
  | "Compilation Error"
  | "Pending";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  bio: string | null;
  problems_solved: number;
  contests_played: number;
  contest_rating: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserSocialLink {
  id: string;
  user_id: string;
  platform: string;
  url: string;
  created_at: string;
}

export interface ProblemType {
  id: number;
  name: ProblemTypeName;
  description: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Problem {
  id: number;
  problem_number?: number;
  title: string;
  slug: string;
  description: string;
  difficulty: ProblemDifficulty;
  type_id: number;
  constraints?: string | null;
  hints?: string[] | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  problem_type?: ProblemType;
  categories?: Category[];
  tags?: Tag[];
}

export interface ProblemCodeTemplate {
  id: number;
  problem_id: number;
  starter_code: string;
  entry_class: string | null;
  entry_method: string | null;
  execution_mode: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: number;
  problem_id: number;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
  created_at: string;
}

export interface ProblemExecutionConfig {
  id: number;
  problem_id: number;
  time_limit_ms: number;
  memory_limit_mb: number;
  allowed_languages: string[];
}

export interface ProblemFile {
  id: number;
  problem_id: number;
  file_path: string;
  file_content: string;
  language: string;
  is_editable: boolean;
  is_entry_point: boolean;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id: number;
  code: string;
  language: string;
  status: SubmissionStatus;
  tests_passed: number;
  tests_total: number;
  accuracy_score: number;
  runtime_ms: number;
  memory_kb: number;
  submitted_at: string;
  updated_at: string;
  profile?: Profile;
  problem?: Problem;
}

export interface SubmissionTestResult {
  id: string;
  submission_id: string;
  test_case_id: number;
  status: string;
  actual_output: string | null;
  error_message: string | null;
  runtime_ms: number;
  memory_kb: number;
  created_at: string;
}

export interface CodeAnalysis {
  id: string;
  submission_id: string;
  readability_score: number;
  maintainability_score: number;
  architecture_score: number;
  naming_score: number;
  modularity_score: number;
  security_score: number;
  design_patterns_score: number;
  summary: string | null;
  created_at: string;
}

export interface CodeAnalysisFeedback {
  id: string;
  analysis_id: string;
  category: string;
  feedback: string;
  line_number: number | null;
}

export interface SubmissionScore {
  id: string;
  submission_id: string;
  accuracy_score: number;
  analysis_score: number;
  overall_score: number;
  updated_at: string;
}

export interface Contest {
  id: number;
  title: string;
  slug: string;
  description: string;
  start_time: string;
  end_time: string;
  is_published: boolean;
  created_at: string;
  participants_count?: number;
}

export interface ContestProblem {
  id: number;
  contest_id: number;
  problem_id: number;
  problem_order: number;
  score_weight: number;
  problem?: Problem;
}

export interface ContestParticipant {
  id: number;
  contest_id: number;
  user_id: string;
  registered_at: string;
  score: number;
  profile?: Profile;
}

export interface ContestSubmission {
  id: string;
  contest_id: number;
  user_id: string;
  problem_id: number;
  code: string;
  language: string;
  status: SubmissionStatus;
  tests_passed: number;
  tests_total: number;
  score: number;
  runtime_ms: number;
  memory_kb: number;
  submitted_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_date: string;
  submission_count: number;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadge {
  id: number;
  user_id: string;
  badge_id: number;
  earned_at: string;
  badge?: Badge;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ProblemUpload {
  id: string;
  admin_id: string;
  file_name: string;
  file_url: string;
  status: string;
  extracted_test_cases_count: number;
  uploaded_at: string;
}

// API Communication Interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SubmissionPayload {
  problemId: number;
  language: string;
  code: string;
  files?: Array<{ file_path: string; file_content: string; language: string }>;
}

export type RunCodePayload =
  | {
      problemId: number;
      language: string;
      code: string;
      files?: never;
    }
  | {
      problemId: number;
      language: string;
      files: Array<{
        file_path: string;
        file_content: string;
        language: string;
      }>;
      code?: never;
    };

export interface ExecutionResult {
  submissionId?: string;
  status: SubmissionStatus;
  testsPassed: number;
  testsTotal: number;
  accuracyScore: number;
  runtimeMs: number;
  memoryKb: number;
  testResults: Array<{
    testCaseId: number;
    status: string;
    actualOutput: string;
    errorMessage?: string;
    runtimeMs: number;
    memoryKb: number;
  }>;
  analysis?: {
    readabilityScore: number;
    maintainabilityScore: number;
    architectureScore: number;
    namingScore: number;
    modularityScore: number;
    securityScore: number;
    designPatternsScore: number;
    summary: string;
    feedbacks: Array<{
      category: string;
      feedback: string;
      lineNumber?: number;
    }>;
  };
  scores?: {
    accuracyScore: number;
    analysisScore: number;
    overallScore: number;
  };
}
