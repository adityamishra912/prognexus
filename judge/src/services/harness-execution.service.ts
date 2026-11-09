
import { performance } from "node:perf_hooks";
import { posix } from "node:path";
import { createSandbox } from "./sandbox.service.js";
import type {
    GeneratedHarness,
    HarnessTestCase
} from "../harness/harness.types.js";

export type TestExecutionResult = {
    testCaseId: number;
    status: string;
    actualOutput: string;
    stdout: string;
    errorMessage: string | null;
    runtimeMs: number | null;
};

export type HarnessExecutionResponse = {
    status:
        | "COMPLETED"
        | "COMPILE_ERROR"
        | "TIME_LIMIT_EXCEEDED"
        | "EXECUTION_ERROR";
    runtimeMs: number;
    memoryKb: number | null;
    compileError: string | null;
    results: TestExecutionResult[];
};

type ExecutionOptions = {
    testCases: HarnessTestCase[];
    timeLimitMs: number;
};

const WORKING_DIRECTORY = "/workspace";
const METRICS_MARKER = "__APEX_METRICS__";

function validateFilePath(filePath: string): string {
    const normalized = posix.normalize(
        filePath.replace(/\\/g, "/")
    );

    if (
        !normalized ||
        normalized === "." ||
        posix.isAbsolute(normalized) ||
        normalized === ".." ||
        normalized.startsWith("../") ||
        normalized.includes("\0")
    ) {
        throw new Error(`Invalid sandbox file path: ${filePath}`);
    }

    return normalized;
}

function parseExecutionRecords(
    stdout: string
): Map<number, TestExecutionResult> {
    const records = new Map<number, TestExecutionResult>();

    for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed) continue;

        try {
            const record = JSON.parse(trimmed);

            if (typeof record.testCaseId !== "number") continue;

            records.set(record.testCaseId, {
                testCaseId: record.testCaseId,
                status: record.status ?? "EXECUTION_ERROR",
                actualOutput: record.actualOutput ?? "",
                stdout: record.stdout ?? "",
                errorMessage: record.errorMessage ?? null,
                runtimeMs: Number.isFinite(record.runtimeMs)
                    ? record.runtimeMs
                    : null
            });
        } catch {
            // Ignore non-protocol output.
        }
    }

    return records;
}

function extractMetrics(stderr: string): {
    runtimeMs: number | null;
    memoryKb: number | null;
    userStderr: string;
} {
    const metricsMatch = stderr.match(
        /__APEX_METRICS__(\d+(?:\.\d+)?)\|(\d+)/
    );

    return {
        runtimeMs: metricsMatch
            ? Math.round(Number(metricsMatch[1]) * 1000)
            : null,

        memoryKb: metricsMatch
            ? Number(metricsMatch[2])
            : null,

        userStderr: stderr
            .replace(/__APEX_METRICS__.*(?:\r?\n)?/g, "")
            .trim()
    };
}

function createFailedResults(
    testCases: HarnessTestCase[],
    status: string,
    errorMessage: string
): TestExecutionResult[] {
    return testCases.map(testCase => ({
        testCaseId: testCase.testCaseId,
        status,
        actualOutput: "",
        stdout: "",
        errorMessage,
        runtimeMs: null
    }));
}

export async function executeGeneratedHarness(
    generated: GeneratedHarness,
    options: ExecutionOptions
): Promise<HarnessExecutionResponse> {
    const sandbox = await createSandbox();

    try {
        // 1. Write submitted and generated source files.
        const sandboxFiles = generated.files.map(file => ({
            path: validateFilePath(file.filePath),
            content: Buffer.from(file.fileContent, "utf8")
        }));

        await sandbox.writeFiles(sandboxFiles);

        // 2. Compile.
        if (generated.compileCommand) {
            const compileStartedAt = performance.now();

            const compileResult = await sandbox.runCommand({
                cmd: "bash",
                args: ["-lc", generated.compileCommand],
                cwd: WORKING_DIRECTORY,
                timeoutMs: 15_000
            });

            const compileStdout = await compileResult.stdout();
            const compileStderr = await compileResult.stderr();

            if (compileResult.exitCode !== 0) {
                const compileError = [
                    compileStdout,
                    compileStderr
                ].filter(Boolean).join("\n").trim()
                    || "Compilation failed.";

                return {
                    status: "COMPILE_ERROR",
                    runtimeMs: Math.round(
                        performance.now() - compileStartedAt
                    ),
                    memoryKb: null,
                    compileError,
                    results: createFailedResults(
                        options.testCases,
                        "COMPILE_ERROR",
                        compileError
                    )
                };
            }
        }

        // 3. Validate and prepare the execution command.
        const commandParts = generated.runCommand.trim().split(/\s+/);
        const executable = commandParts[0];
        const executableArgs = commandParts.slice(1);

        if (!executable) {
            throw new Error("Execution command is missing.");
        }

        // 4. Execute with a time limit and GNU time metrics.
        // %e = elapsed seconds
        // %M = maximum resident set size in KB
        const executionStartedAt = performance.now();

        let runResult;

        try {
            const timeoutSeconds = (options.timeLimitMs / 1000).toFixed(3);

            runResult = await sandbox.runCommand({
                cmd: "timeout",
                args: [
                    "--signal=TERM",
                    "--kill-after=1s",
                    `${timeoutSeconds}s`,
                    "/usr/bin/time",
                    "-f",
                    `${METRICS_MARKER}%e|%M`,
                    executable,
                    ...executableArgs
                ],
                cwd: WORKING_DIRECTORY,
                timeoutMs: options.timeLimitMs + 5_000
            });
        } catch (error) {
            const elapsedMs = Math.round(
                performance.now() - executionStartedAt
            );

            const message = error instanceof Error
                ? error.message
                : String(error);

            const timedOut = elapsedMs >= options.timeLimitMs;

            return {
                status: timedOut
                    ? "TIME_LIMIT_EXCEEDED"
                    : "EXECUTION_ERROR",
                runtimeMs: elapsedMs,
                memoryKb: null,
                compileError: null,
                results: createFailedResults(
                    options.testCases,
                    timedOut
                        ? "TIME_LIMIT_EXCEEDED"
                        : "EXECUTION_ERROR",
                    message
                )
            };
        }

        const executionElapsedMs = Math.round(
            performance.now() - executionStartedAt
        );

        // 5. Collect process output.
        const stdout = await runResult.stdout();
        const stderr = await runResult.stderr();

        // 6. Extract process runtime and peak memory.
        const metrics = extractMetrics(stderr);

        const runtimeMs = metrics.runtimeMs ?? executionElapsedMs;
        const memoryKb = metrics.memoryKb;

        const userStderr = metrics.userStderr;

        // GNU timeout normally returns 124 on timeout.
        // 137 can indicate a process killed with SIGKILL.
        const timedOut =
            runResult.exitCode === 124 ||
            runResult.exitCode === 137;

        // 7. Parse one JSON result per test case.
        const parsedRecords = parseExecutionRecords(stdout);

        const results = options.testCases.map(testCase => {
            const record = parsedRecords.get(testCase.testCaseId);

            if (record) {
                return {
                    ...record,
                    errorMessage:
                        record.errorMessage ??
                        (
                            record.status === "RUNTIME_ERROR"
                                ? userStderr || null
                                : null
                        )
                };
            }

            return {
                testCaseId: testCase.testCaseId,
                status: timedOut
                    ? "TIME_LIMIT_EXCEEDED"
                    : "EXECUTION_ERROR",
                actualOutput: "",
                stdout: "",
                errorMessage:
                    userStderr || "No execution result received.",
                runtimeMs: null
            };
        });

        const hasRuntimeError = results.some(
            result => result.status === "RUNTIME_ERROR"
        );

        const hasMissingRecords = results.some(
            result =>
                !parsedRecords.has(result.testCaseId)
        );

        // 8. Return execution facts.
        return {
            status: timedOut
                ? "TIME_LIMIT_EXCEEDED"
                : runResult.exitCode === 0
                    ? "COMPLETED"
                    : hasRuntimeError && !hasMissingRecords
                        ? "COMPLETED"
                        : "EXECUTION_ERROR",

            runtimeMs,
            memoryKb,
            compileError: null,
            results
        };

    } finally {
        // Cleanup must not replace the original execution result/error.
        try {
            await sandbox.stop();
        } catch (error) {
            console.error("Failed to stop Sandbox:", error);
        }
    }
}