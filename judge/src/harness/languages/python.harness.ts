
import type {
    FunctionSpec,
    HarnessFile,
    HarnessTestCase
} from "../harness.types.js";

export function generatePythonHarness(
    files: HarnessFile[],
    spec: FunctionSpec,
    testCases: HarnessTestCase[]
): HarnessFile[] {

    if (!testCases.length) {
        throw new Error("At least one test case is required");
    }

    // Current supported function signature:
    // def twoSum(self, nums: list[int], target: int) -> list[int]

    const returnType = spec.return;

    if (
        returnType.type !== "array" ||
        returnType.element_type !== "integer"
    ) {
        throw new Error(
            "Python harness currently supports list[integer] return type only"
        );
    }

    const argumentsList = [...spec.arguments].sort(
        (a, b) => a.position - b.position
    );

    const numsArgument = argumentsList[0];
    const targetArgument = argumentsList[1];

    if (
        argumentsList.length !== 2 ||
        !numsArgument ||
        !targetArgument ||
        numsArgument.name !== "nums" ||
        numsArgument.type !== "array" ||
        numsArgument.element_type !== "integer" ||
        targetArgument.name !== "target" ||
        targetArgument.type !== "integer"
    ) {
        throw new Error(
            "Unsupported Python function arguments. Expected nums: array<integer>, target: integer"
        );
    }

    const testBlocks = testCases.map((testCase) => {
        let input: Record<string, unknown>;

        try {
            input = JSON.parse(testCase.input);
        } catch {
            throw new Error(
                `Invalid JSON input for test case ${testCase.testCaseId}`
            );
        }

        const nums = input.nums;
        const target = input.target;

        if (
            !Array.isArray(nums) ||
            !nums.every(
                (value) =>
                    typeof value === "number" &&
                    Number.isSafeInteger(value)
            )
        ) {
            throw new Error(
                `Invalid nums array in test case ${testCase.testCaseId}`
            );
        }

        if (
            typeof target !== "number" ||
            !Number.isSafeInteger(target)
        ) {
            throw new Error(
                `Invalid target in test case ${testCase.testCaseId}`
            );
        }

        const numsLiteral = `[${nums.join(", ")}]`;

        return `
    # Test Case ${testCase.testCaseId}
    nums = ${numsLiteral}
    target = ${target}

    result = solution.${spec.function_name}(nums, target)

    print("Test Case ID: ${testCase.testCaseId}")
    print("Output:", result)
`;
    }).join("\n");

    const harness = `
def main():
    solution = Solution()

${testBlocks}

if __name__ == "__main__":
    main()
`;

    return [
        ...files.filter(
            (file) => file.filePath !== "harness.py"
        ),
        {
            filePath: "harness.py",
            fileContent: harness,
            language: "python"
        }
    ];
}