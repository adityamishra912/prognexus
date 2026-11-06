
import type {
    FunctionSpec,
    HarnessFile,
    HarnessTestCase
} from "../harness.types.js";

export function generateCppHarness(
    files: HarnessFile[],
    spec: FunctionSpec,
    testCases: HarnessTestCase[]
): HarnessFile[] {

    if (!testCases.length) {
        throw new Error("At least one test case is required");
    }

    // Current supported function signature:
    // vector<int> twoSum(vector<int> nums, int target)

    const returnType = spec.return;

    if (
        returnType.type !== "array" ||
        returnType.element_type !== "integer"
    ) {
        throw new Error(
            "C++ harness currently supports array<integer> return type only"
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
            "Unsupported C++ function arguments. Expected nums: array<integer>, target: integer"
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
                    Number.isSafeInteger(value) &&
                    typeof value === "number"
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

        const numsLiteral = nums.join(", ");

        return `
    // Test Case ${testCase.testCaseId}
    {
        vector<int> nums = {${numsLiteral}};
        int target = ${target};

        vector<int> result = solution.${spec.function_name}(nums, target);

        cout << "Test Case ID: ${testCase.testCaseId}" << endl;
        cout << "Output: ";

        cout << "[";
        for (size_t i = 0; i < result.size(); i++) {
            if (i > 0) cout << ", ";
            cout << result[i];
        }
        cout << "]" << endl;
    }
`;
    }).join("\n");

    const harness = `
#include <iostream>
#include <vector>
using namespace std;

int main() {
    Solution solution;

    ${testBlocks}

    return 0;
}
`;

    return [
        ...files.filter(
            (file) => file.filePath !== "main.cpp"
        ),
        {
            filePath: "main.cpp",
            fileContent: harness,
            language: "cpp"
        }
    ];
}