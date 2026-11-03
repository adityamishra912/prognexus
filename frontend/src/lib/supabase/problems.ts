
import { ProblemCodeTemplate } from "@/types";
import { createClient } from "@/lib/supabase/client";

type TemplateRow = {
  id: number;
  problem_id: number;
  java_starter_code: string | null;
  python_starter_code: string | null;
  c_starter_code: string | null;
  cpp_starter_code: string | null;
  entry_class: string | null;
  entry_method: string | null;
  execution_mode: string;
  created_at: string;
  updated_at: string;
};

type TemplateColumn =
  | "java_starter_code"
  | "python_starter_code"
  | "c_starter_code"
  | "cpp_starter_code";

export async function fetchProblemCodeTemplate(
  problemId: number,
  language: string
): Promise<ProblemCodeTemplate | null> {
  const supabase = createClient();

  const languageColumns: Record<string, TemplateColumn> = {
    java: "java_starter_code",
    python: "python_starter_code",
    c: "c_starter_code",
    cpp: "cpp_starter_code",
    "c++": "cpp_starter_code",
  };

  const normalizedLanguage = language.toLowerCase();
  const column = languageColumns[normalizedLanguage];

  if (!column) {
    throw new Error(`Unsupported template language: ${language}`);
  }

  const { data, error } = await supabase
    .from("problem_code_templates")
    .select("*")
    .eq("problem_id", problemId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load the ${language} starter template: ${error.message}`
    );
  }

  if (!data) return null;

  // Treat the fetched row as the updated template schema.
  const template = data as unknown as TemplateRow;

  const starterCode = template[column];

  if (!starterCode?.trim()) {
    return null;
  }

  return {
    id: template.id,
    problem_id: template.problem_id,
    starter_code: starterCode,
    entry_class: template.entry_class,
    entry_method: template.entry_method,
    execution_mode: template.execution_mode,
    created_at: template.created_at,
    updated_at: template.updated_at,
  } as ProblemCodeTemplate;
}