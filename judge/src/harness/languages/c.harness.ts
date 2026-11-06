
import type {
    FunctionSpec,
    HarnessFile,
    HarnessTestCase
} from "../harness.types.js";

export function generateCHarness(
    files: HarnessFile[],
    spec: FunctionSpec,
    testCases: HarnessTestCase[]
): HarnessFile[] {

    if (!testCases.length) {
        throw new Error("At least one test case is required");
    }

    // Current supported function signature:
    // int* twoSum(int* nums, int numsSize, int target)

    const returnType = spec.return;

    if (
        returnType.type !== "array" ||
        returnType.element_type !== "integer"
    ) {
        throw new Error(
            "C harness currently supports int array return type only"
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
            "Unsupported C function arguments. Expected nums: array<integer>, target: integer"
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

        const numsLiteral = nums.length
            ? nums.join(", ")
            : "0";

        return `
    // Test Case ${testCase.testCaseId}
    {
        int nums[] = {${numsLiteral}};
        int numsSize = ${nums.length};
        int target = ${target};

        int returnSize = 0;

        int* result = ${spec.function_name}(
            nums,
            numsSize,
            target,
            &returnSize
        );

        printf("Test Case ID: ${testCase.testCaseId}\\n");
        printf("Output: [");

        for (int i = 0; i < returnSize; i++) {
            if (i > 0) printf(", ");
            printf("%d", result[i]);
        }

        printf("]\\n");

        free(result);
    }
`;
    }).join("\n");

    const harness = `
#include <stdio.h>
#include <stdlib.h>

// Submitted solution function declaration
int* ${spec.function_name}(int* nums, int numsSize, int target, int* returnSize);

int main(void) {

    ${testBlocks}

    return 0;
}
`;

    return [
        ...files.filter(
            (file) => file.filePath !== "harness.c"
        ),
        {
            filePath: "harness.c",
            fileContent: harness,
            language: "c"
        }
    ];
}