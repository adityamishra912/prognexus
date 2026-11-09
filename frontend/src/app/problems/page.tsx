"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Code, Sparkles } from "lucide-react";
import { Problem, Category, ProblemType} from "@/types";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { ProblemFilters } from "@/components/problems/ProblemFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

export default function ProblemsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [difficulty, setDifficulty] = useState(
    searchParams.get("difficulty") ?? ""
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") ?? "1", 10)
  );

  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ProblemType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const pageSize = 8;

  useEffect(() => {
    async function loadMetadata() {
      const [
        { data: catData, error: categoriesError },
        { data: typeData, error: typesError },
      ] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("problem_types").select("*"),
      ]);

      if (catData) setCategories(catData);
      if (typeData) setTypes(typeData);

      const errors = [categoriesError, typesError]
        .filter((metadataError) => metadataError !== null)
        .map((metadataError) => metadataError.message);
      if (errors.length > 0) {
        setMetadataError(`Some filters could not be loaded: ${errors.join("; ")}`);
      }
    }
    loadMetadata();
  }, [supabase]);

  useEffect(() => {
    async function fetchProblems() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        let query = supabase
          .from("problems")
          .select(
            `
  id,
  problem_number,
  title,
  slug,
  description,
  type_id,
  difficulty,
  is_published,
  created_at,
  updated_at,
  problem_type:problem_types${type ? "!inner" : ""}(*),
  categories:problem_categories${category ? "!inner" : ""}(categories${category ? "!inner" : ""}(*)),
  tags:problem_tags(tags(*))
          `,
            { count: "exact" }
          )
          .eq("is_published", true);

        if (search) {
          query = query.or(
            `title.ilike.%${search}%,description.ilike.%${search}%`
          );
        }

        if (difficulty) {
          query = query.eq("difficulty", difficulty);
        }

        if (type) {
          query = query.eq("problem_type.name", type);
        }

        if (category) {
          query = query.eq("categories.categories.slug", category);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await query
          .order("problem_number", { ascending: true })
          .range(from, to);

        if (error) {
          throw new Error(error.message);
        }

        const formatted: Problem[] = (data ?? []).map((problem) => ({
          ...problem,

          problem_type: Array.isArray(problem.problem_type)
            ? problem.problem_type[0] ?? undefined
            : problem.problem_type ?? undefined,

          categories: (problem.categories ?? [])
            .flatMap((relation) => relation.categories ?? []),

          tags: (problem.tags ?? [])
            .flatMap((relation) => relation.tags ?? []),
        }));

        setProblems(formatted);
        setTotalCount(count ?? 0);
      } catch (error: unknown) {
        setProblems([]);
        setTotalCount(0);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while loading problems."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchProblems();
  }, [search, category, type, difficulty, page, supabase]);

  const handleResetFilters = () => {
    setSearch("");
    setCategory("");
    setType("");
    setDifficulty("");
    setPage(1);
    router.push("/problems");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-xs font-semibold text-blue-400">
          <Code className="w-3.5 h-3.5" /> Problem Archive
        </div>
        <h1 className="text-3xl font-bold text-slate-100">Coding Problems</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Search and filter algorithm challenges, development tasks, SQL queries, and shell scripts.
        </p>
      </div>

      {/* Filter Toolbar */}
      {metadataError && (
        <p role="status" className="text-xs text-amber-400">
          {metadataError}
        </p>
      )}
      <ProblemFilters
        search={search}
        category={category}
        type={type}
        difficulty={difficulty}
        categories={categories}
        types={types}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onCategoryChange={(val) => {
          setCategory(val);
          setPage(1);
        }}
        onTypeChange={(val) => {
          setType(val);
          setPage(1);
        }}
        onDifficultyChange={(val) => {
          setDifficulty(val);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Problem Listing */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <Card role="alert" className="text-center py-12 space-y-3">
          <h3 className="text-base font-semibold text-rose-300">
            Unable to load problems
          </h3>
          <p className="text-xs text-slate-400">{errorMessage}</p>
        </Card>
      ) : problems.length > 0 ? (
        <div className="space-y-3">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <Card className="text-center py-12 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">
            No published problems found
          </h3>
          <p className="text-xs text-slate-500">
            Try adjusting your search criteria or resetting filters.
          </p>
        </Card>
      )}
    </div>
  );
}
