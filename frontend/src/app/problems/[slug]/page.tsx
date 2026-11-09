import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { Problem, Submission } from "@/types";
import { Card } from "@/components/ui/Card";

export interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProblemDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: problemData, error: problemError } = await supabase
    .from("problems")
    .select(`
      *,
      problem_type:problem_types(*),
      categories:problem_categories(categories(*)),
      tags:problem_tags(tags(*))
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (problemError) {
    return (
      <Card className="my-8 text-center py-12 space-y-3">
        <h1 className="text-lg font-semibold text-rose-300">
          Unable to load this problem
        </h1>
        <p className="text-sm text-slate-400">{problemError.message}</p>
      </Card>
    );
  }

  if (!problemData) {
    notFound();
  }

  const problem: Problem = {
    ...problemData,
    categories: problemData.categories
      ? problemData.categories.map(
          (relation: { categories: unknown }) => relation.categories
        )
      : [],
    tags: problemData.tags
      ? problemData.tags.map((relation: { tags: unknown }) => relation.tags)
      : [],
  };

  const [
    { data: testCases, error: testCasesError },
    { data: problemFiles },
    { data: executionConfig, error: executionConfigError },
  ] = await Promise.all([
    supabase
      .from("test_cases")
      .select(
        "id, problem_id, input_data, expected_output, is_hidden, weight, created_at"
      )
      .eq("problem_id", problem.id)
      .eq("is_hidden", false),
    supabase.from("problem_files").select("*").eq("problem_id", problem.id),
    supabase
      .from("problem_execution_config")
      .select("allowed_languages")
      .eq("problem_id", problem.id)
      .maybeSingle(),
  ]);

  let userSubmission: Submission | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("submissions")
      .select("*")
      .eq("problem_id", problem.id)
      .eq("user_id", user.id)
      .maybeSingle();
    userSubmission = sub;
  }

  const { data: publicSubmissions } = await supabase
    .from("submissions")
    .select(`
      *,
      profile:profiles(username, full_name, profile_picture_url)
    `)
    .eq("problem_id", problem.id)
    .order("accuracy_score", { ascending: false })
    .limit(10);

  const problemTypeName = problem.problem_type?.name ?? "dsa";

  return (
    <div className="py-2">
      <MonacoEditor
        problem={problem}
        problemId={problem.id}
        problemType={problemTypeName}
        allowedLanguages={executionConfig?.allowed_languages ?? []}
        executionConfigError={executionConfigError?.message}
        initialFiles={problemFiles ?? []}
        testCases={testCases ?? []}
        testCasesError={testCasesError?.message}
        previousSubmission={userSubmission}
        publicSubmissions={publicSubmissions ?? []}
      />
    </div>
  );
}
