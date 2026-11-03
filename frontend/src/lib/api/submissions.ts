import { apiRequest } from "./client";
import {
  SubmissionPayload,
  ExecutionResult,
  Submission,
  SubmissionScore,
  CodeAnalysis,
  RunCodePayload
} from "@/types";

export interface SavedSolutionResponse {
  submission: Submission | null;
  scores: SubmissionScore | null;
  analysis: CodeAnalysis | null;
}

export async function runProblemCode(
  payload: RunCodePayload
): Promise<ExecutionResult> {
  const response = await apiRequest<ExecutionResult>("/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(
    response.error ?? "The execution service did not return a result."
  );
}

export async function submitProblemSolution(
  payload: SubmissionPayload
): Promise<ExecutionResult> {
  const response = await apiRequest<ExecutionResult>("/submissions/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.error ?? "The execution service did not return a result.");
}

export async function fetchUserLatestSubmission(
  problemId: number,
  userId: string
): Promise<SavedSolutionResponse> {
  const response = await apiRequest<SavedSolutionResponse>(
    `/submissions/user/${userId}/problem/${problemId}`
  );

  if (response.success && response.data) {
    return response.data;
  }

  return {
    submission: null,
    scores: null,
    analysis: null,
  };
}

export async function fetchProblemSubmissions(
  problemId: number
): Promise<Submission[]> {
  const response = await apiRequest<Submission[]>(
    `/submissions/problem/${problemId}`
  );

  if (response.success && response.data) {
    return response.data;
  }

  return [];
}
