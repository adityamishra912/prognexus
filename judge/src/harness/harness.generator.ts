
import type {
    HarnessInput,
    GeneratedHarness
} from "./harness.types.js";

import { generateJavaHarness } from "./languages/java.harness.js";
import { generatePythonHarness } from "./languages/python.harness.js";
import { generateCHarness } from "./languages/c.harness.js";
import { generateCppHarness } from "./languages/cpp.harness.js";

export function generateHarness(
    input: HarnessInput
): GeneratedHarness {

    const {
        language,
        executionMode,
        files,
        testCases,
        functionSpec
    } = input;

    if (files.length === 0) {
        throw new Error("At least one source file is required");
    }

    if (executionMode === "STDIN") {
        const entryPoints = {
            java: "Main.java",
            python: "main.py",
            c: "main.c",
            cpp: "main.cpp"
        };

        const commands = {
            java: {
                compileCommand: "javac *.java",
                runCommand: "java Main"
            },
            python: {
                runCommand: "python3 main.py"
            },
            c: {
                compileCommand: "gcc *.c -o program",
                runCommand: "./program"
            },
            cpp: {
                compileCommand: "g++ *.cpp -o program",
                runCommand: "./program"
            }
        };

        return {
            files,
            entryPoint: entryPoints[language],
            ...commands[language]
        };
    }

    if (!functionSpec) {
        throw new Error(
            "functionSpec is required for FUNCTION execution mode"
        );
    }

    if (!testCases.length) {
        throw new Error(
            "At least one test case is required for FUNCTION execution mode"
        );
    }

    let generatedFiles;

    switch (language) {
        case "java":
            generatedFiles = generateJavaHarness(
                files,
                functionSpec,
                testCases
            );
            break;

        case "python":
            generatedFiles = generatePythonHarness(
                files,
                functionSpec,
                testCases
            );
            break;

        case "c":
            generatedFiles = generateCHarness(
                files,
                functionSpec,
                testCases
            );
            break;

        case "cpp":
            generatedFiles = generateCppHarness(
                files,
                functionSpec,
                testCases
            );
            break;

        default:
            throw new Error(`Unsupported language: ${language}`);
    }

    const commands = {
        java: {
            entryPoint: "Main.java",
            compileCommand: "javac *.java",
            runCommand: "java Main"
        },
        python: {
            entryPoint: "harness.py",
            runCommand: "python3 harness.py"
        },
        c: {
            entryPoint: "harness.c",
            compileCommand: "gcc *.c -o program",
            runCommand: "./program"
        },
        cpp: {
            entryPoint: "main.cpp",
            compileCommand: "g++ *.cpp -o program",
            runCommand: "./program"
        }
    };

    return {
        files: generatedFiles,
        ...commands[language]
    };
}