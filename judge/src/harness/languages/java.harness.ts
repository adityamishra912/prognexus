
import type {
    FunctionSpec,
    HarnessFile,
    HarnessTestCase
} from "../harness.types.js";

export function generateJavaHarness(
    files: HarnessFile[],
    spec: FunctionSpec,
    testCases: HarnessTestCase[]
): HarnessFile[] {

    if (!testCases.length) {
        throw new Error("At least one test case is required.");
    }

    if (!spec.function_name) {
        throw new Error("Function name is missing.");
    }

    const sourceFile = files.find(file =>
        file.filePath.endsWith(".java")
    );

    if (!sourceFile) {
        throw new Error("Java solution file not found.");
    }

    const argumentsList = [...spec.arguments].sort(
        (a, b) => a.position - b.position
    );

    // Generate one execution block for every test case.
    const testBlocks = testCases.map(testCase => {

        let input: Record<string, unknown>;

        try {
            input = JSON.parse(testCase.input);
        } catch {
            throw new Error(
                `Invalid JSON input in test case ${testCase.testCaseId}`
            );
        }

        // Generate argument declarations.
        const declarations = argumentsList.map(argument => {

            const value = input[argument.name];

            switch (argument.type) {

                case "array": {

                    if (argument.element_type !== "integer") {
                        throw new Error(
                            `Unsupported array element type: ${argument.element_type}`
                        );
                    }

                    if (
                        !Array.isArray(value) ||
                        !value.every(
                            item =>
                                typeof item === "number" &&
                                Number.isSafeInteger(item)
                        )
                    ) {
                        throw new Error(
                            `Invalid integer array '${argument.name}' in test case ${testCase.testCaseId}`
                        );
                    }

                    return `int[] ${argument.name} = new int[]{${value.join(", ")}};`;
                }

                case "integer": {

                    if (
                        typeof value !== "number" ||
                        !Number.isSafeInteger(value)
                    ) {
                        throw new Error(
                            `Invalid integer '${argument.name}' in test case ${testCase.testCaseId}`
                        );
                    }

                    return `int ${argument.name} = ${value};`;
                }

                default:
                    throw new Error(
                        `Unsupported Java argument type: ${argument.type}`
                    );
            }

        }).join("\n                ");

        const invocationArguments = argumentsList
            .map(argument => argument.name)
            .join(", ");

        const invocation =
            `solution.${spec.function_name}(${invocationArguments})`;

        // Generate return-value handling.
        let resultDeclaration: string;

        if (
            spec.return.type === "array" &&
            spec.return.element_type === "integer"
        ) {
            resultDeclaration = `
                int[] result = ${invocation};
                actualOutput = Arrays.toString(result);
            `;
        } else if (spec.return.type === "integer") {
            resultDeclaration = `
                int result = ${invocation};
                actualOutput = String.valueOf(result);
            `;
        } else {
            throw new Error(
                `Unsupported Java return type: ${spec.return.type}`
            );
        }

        // Generate an independent execution block.
        return `
        {
            ByteArrayOutputStream userOutput =
                new ByteArrayOutputStream();

            PrintStream originalOut = System.out;

            String actualOutput = "";
            String stdout = "";
            String executionStatus = "COMPLETED";
            String errorMessage = null;

            long caseStartedAt = System.nanoTime();
            long caseRuntimeMs = 0;

            try {

                System.setOut(new PrintStream(userOutput));

                ${declarations}

                ${resultDeclaration}

            } catch (Throwable error) {

                executionStatus = "RUNTIME_ERROR";
                errorMessage = error.toString();

            } finally {

                caseRuntimeMs =
                    (System.nanoTime() - caseStartedAt) / 1_000_000L;

                System.setOut(originalOut);

                stdout = userOutput.toString();

                userOutput.reset();
            }

            String record = "{"
                + "\\"testCaseId\\":${testCase.testCaseId},"
                + "\\"status\\":\\"" + executionStatus + "\\","
                + "\\"actualOutput\\":\\"" + jsonEscape(actualOutput) + "\\","
                + "\\"stdout\\":\\"" + jsonEscape(stdout) + "\\","
                + "\\"errorMessage\\":"
                + (errorMessage == null
                    ? "null"
                    : "\\"" + jsonEscape(errorMessage) + "\\"")
                + ",\\"runtimeMs\\":" + caseRuntimeMs
                + "}";

            originalOut.println(record);
        }
`;
    }).join("\n");

    // Complete generated Main.java.
    const harness = `
import java.util.*;
import java.io.*;

public class Main {

    private static String jsonEscape(String value) {

        if (value == null) {
            return "";
        }

        StringBuilder escaped = new StringBuilder();

        for (int i = 0; i < value.length(); i++) {

            char c = value.charAt(i);

            switch (c) {

                case '"':
                    escaped.append("\\\\\\"");
                    break;

                case '\\\\':
                    escaped.append("\\\\\\\\");
                    break;

                case '\\n':
                    escaped.append("\\\\n");
                    break;

                case '\\r':
                    escaped.append("\\\\r");
                    break;

                case '\\t':
                    escaped.append("\\\\t");
                    break;

                case '\\b':
                    escaped.append("\\\\b");
                    break;

                case '\\f':
                    escaped.append("\\\\f");
                    break;

                default:
                    if (c < 0x20) {
                        escaped.append(
                            String.format("\\\\u%04x", (int) c)
                        );
                    } else {
                        escaped.append(c);
                    }
            }
        }

        return escaped.toString();
    }

    public static void main(String[] args) {

        PrintStream originalOut = System.out;

        Solution solution = new Solution();

        ${testBlocks}
    }
}
`;

    return [
        ...files.filter(file => file.filePath !== "Main.java"),
        {
            filePath: "Main.java",
            fileContent: harness,
            language: "java"
        }
    ];
}
