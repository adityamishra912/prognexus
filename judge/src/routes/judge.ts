
import { Router } from "express";
import type { Request, Response } from "express";

import { generateHarness } from "../harness/harness.generator.js";
import { executeGeneratedHarness } from "../services/harness-execution.service.js";

import type {
    HarnessInput,
    SupportedLanguage,
    ExecutionMode,
    FunctionSpec,
    HarnessFile,
    HarnessTestCase
} from "../harness/harness.types.js";

const router = Router();

type JudgeRequest = {
    problemId: number;
    language: SupportedLanguage;
    files: HarnessFile[];
    testCases: HarnessTestCase[];
    executionMode: ExecutionMode;
    functionSpec?: FunctionSpec;
    executionConfig?: Record<string, unknown>;
    timeLimitMs?: number;
    memoryLimitMb?: number;
};

router.post(
    "/execute",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const body = req.body as JudgeRequest;

            console.log("\n");
            console.log("================================================");
            console.log("           APEXCODE - INCOMING REQUEST");
            console.log("================================================");
            console.log(JSON.stringify(body, null, 4));
            console.log("================================================\n");

            if (
                !body.problemId ||
                !body.language ||
                !body.files?.length ||
                !Array.isArray(body.testCases)
            ) {
                res.status(400).json({
                    success: false,
                    error: "Invalid judge execution request"
                });
                return;
            }

            const supportedLanguages: SupportedLanguage[] = [
                "java",
                "python",
                "c",
                "cpp"
            ];

            if (!supportedLanguages.includes(body.language)) {
                res.status(400).json({
                    success: false,
                    error: "Unsupported language"
                });
                return;
            }

            if (!["FUNCTION", "STDIN"].includes(body.executionMode)) {
                res.status(400).json({
                    success: false,
                    error: "Unsupported execution mode"
                });
                return;
            }

            if (
                body.executionMode === "FUNCTION" &&
                !body.functionSpec
            ) {
                res.status(400).json({
                    success: false,
                    error: "functionSpec is required for FUNCTION mode"
                });
                return;
            }

            if (
                body.executionMode === "FUNCTION" &&
                body.testCases.length === 0
            ) {
                res.status(400).json({
                    success: false,
                    error: "At least one test case is required"
                });
                return;
            }

            // 1. Generate language-specific harness.
            const harnessInput: HarnessInput = {
                language: body.language,
                executionMode: body.executionMode,
                files: body.files,
                testCases: body.testCases,
                ...(body.functionSpec
                    ? { functionSpec: body.functionSpec }
                    : {})
            };

            const generated = generateHarness(harnessInput);

            console.log("\n");
            console.log("================================================");
            console.log("           APEXCODE - GENERATED HARNESS");
            console.log("================================================");

            console.log(`Language: ${body.language}`);
            console.log(`Entry Point: ${generated.entryPoint}`);
            console.log(`Compile Command: ${generated.compileCommand ?? "Not required"}`);
            console.log(`Run Command: ${generated.runCommand}`);

            for (const file of generated.files) {
                console.log(`\n========== ${file.filePath} ==========`);
                console.log(file.fileContent);
                console.log(`========== END: ${file.filePath} ==========`);
            }

            // 2. Execute generated files inside Vercel Sandbox.

            // Validate timeLimitMs
            const timeLimitMs = body.timeLimitMs ?? 2000;

            if (
                !Number.isInteger(timeLimitMs) ||
                timeLimitMs <= 0 ||
                timeLimitMs > 10_000
            ) {
                res.status(400).json({
                    success: false,
                    error: "Invalid time limit"
                });
                return;
            }

            const execution = await executeGeneratedHarness(
                generated,
                {
                    testCases: body.testCases,
                    timeLimitMs: body.timeLimitMs ?? 2000
                }
            );

            // 3. Return real execution results to Spring Boot.
            const response = {
                status: execution.status,
                runtimeMs: execution.runtimeMs,
                memoryKb: execution.memoryKb,
                compileError: execution.compileError,
                results: execution.results
            };

            console.log("\n");
            console.log("================================================");
            console.log("           APEXCODE - EXECUTION RESPONSE");
            console.log("================================================");
            console.log(JSON.stringify(response, null, 4));
            console.log("================================================\n");

            res.status(200).json(response);

        } catch (error) {
            console.error("\n");
            console.error("================================================");
            console.error("           APEXCODE - EXECUTION ERROR");
            console.error("================================================");
            console.error(error);
            console.error("================================================\n");

            res.status(500).json({
                success: false,
                error: "Judge execution failed",
                message: error instanceof Error
                    ? error.message
                    : "Unknown error"
            });
        }
    }
);

export default router;