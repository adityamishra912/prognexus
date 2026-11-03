import { Router } from "express";
import type { Request, Response } from "express";
import { createSandbox } from "../services/sandbox.service.js";

const router = Router();

/**
 * Command configuration
 */
type CommandSpec = {
    cmd: string;
    args: string[];
};

type ProgramSpec = {
    filename: string;
    compile: CommandSpec | null;
    run: CommandSpec;
    code: string;
};

/**
 * Temporary smoke-test programs.
 * These will later be replaced by dynamic student code and generated drivers.
 */
const programs: Record<string, ProgramSpec> = {
    java: {
        filename: "Main.java",
        compile: {
            cmd: "javac",
            args: ["Main.java"],
        },
        run: {
            cmd: "java",
            args: ["Main"],
        },
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Java works!");
    }
}`,
    },

    python: {
        filename: "main.py",
        compile: null,
        run: {
            cmd: "python3.12",
            args: ["main.py"],
        },
        code: `print("Python works!")`,
    },

    c: {
        filename: "main.c",
        compile: {
            cmd: "gcc",
            args: ["main.c", "-O2", "-o", "main"],
        },
        run: {
            cmd: "./main",
            args: [],
        },
        code: `#include <stdio.h>

int main() {
    printf("C works!\\n");
    return 0;
}`,
    },

    cpp: {
        filename: "main.cpp",
        compile: {
            cmd: "g++",
            args: ["main.cpp", "-std=c++17", "-O2", "-o", "main"],
        },
        run: {
            cmd: "./main",
            args: [],
        },
        code: `#include <iostream>

int main() {
    std::cout << "C++ works!" << std::endl;
    return 0;
}`,
    },
};

/**
 * POST /api/execute/test
 *
 * Creates a Vercel Sandbox using the custom runtime image,
 * writes a sample program, compiles it if necessary,
 * executes it, and returns the result.
 */
router.post(
    "/test",
    async (req: Request, res: Response): Promise<void> => {
        const { language } = req.body as { language?: string };

        // Validate language
        if (!language || !Object.hasOwn(programs, language)) {
            res.status(400).json({
                success: false,
                error: "Unsupported language",
                supportedLanguages: Object.keys(programs),
            });
            return;
        }

        const program = programs[language];

        if (!program) {
            res.status(400).json({
                success: false,
                error: "Unsupported language",
                supportedLanguages: Object.keys(programs),
            });
            return;
        }

        let sandbox: Awaited<ReturnType<typeof createSandbox>> | undefined;

        try {
            // 1. Create isolated sandbox
            sandbox = await createSandbox();

            // 2. Write source file
            await sandbox.writeFiles([
                {
                    path: program.filename,
                    content: Buffer.from(program.code, "utf-8"),
                },
            ]);

            // 3. Compile source if required
            if (program.compile) {
                const compilation = await sandbox.runCommand({
                    cmd: program.compile.cmd,
                    args: program.compile.args,
                    cwd: "/workspace",
                    timeoutMs: 15_000,
                });

                const compilationStdout = await compilation.stdout();
                const compilationStderr = await compilation.stderr();

                if (compilation.exitCode !== 0) {
                    res.status(200).json({
                        success: false,
                        language,
                        stage: "compilation",
                        stdout: compilationStdout,
                        stderr: compilationStderr,
                        exitCode: compilation.exitCode,
                    });
                    return;
                }
            }

            // 4. Execute program
            const execution = await sandbox.runCommand({
                cmd: program.run.cmd,
                args: program.run.args,
                cwd: "/workspace",
                timeoutMs: 10_000,
            });

            const stdout = await execution.stdout();
            const stderr = await execution.stderr();

            // 5. Return execution result
            res.status(200).json({
                success: execution.exitCode === 0,
                language,
                stage: "execution",
                stdout,
                stderr,
                exitCode: execution.exitCode,
            });
        } catch (error) {
            console.error("Sandbox execution error:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: "Sandbox execution failed",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Unknown execution error",
                });
            }
        } finally {
            // 6. Stop one-off sandbox
            if (sandbox) {
                try {
                    await sandbox.stop();
                } catch (error) {
                    console.error("Sandbox cleanup failed:", error);
                }
            }
        }
    }
);

export default router;