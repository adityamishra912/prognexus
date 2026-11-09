import { ApiResponse } from "@/types";

const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        data: null,
        error: `HTTP Error ${response.status}: ${errorText || response.statusText}`,
      };
    }

    const data: T = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown network error";
    return {
      success: false,
      data: null,
      error: errorMessage,
    };
  }
}

export { API_BASE_URL };
