
import { generateHarness } from "./harness.generator.js";

const sources = {
    java: `
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}
`,
    python: `
class Solution:
    def add(self, a, b):
        return a + b
`,
    c: `
int add(int a, int b) {
    return a + b;
}
`,
    cpp: `
class Solution {
public:
    int add(int a, int b) {
        return a + b;
    }
};
`
};

const filePaths = {
    java: "Solution.java",
    python: "solution.py",
    c: "solution.c",
    cpp: "solution.cpp"
};

const languages = ["java", "python", "c", "cpp"] as const;

for (const language of languages) {
    console.log("\n==================================");
    console.log(`LANGUAGE: ${language.toUpperCase()}`);
    console.log("==================================");

    const generated = generateHarness({
        language,
        executionMode: "FUNCTION",
        files: [
            {
                filePath: filePaths[language],
                fileContent: sources[language],
                language
            }
        ],
        functionSpec: {
            className: "Solution",
            functionName: "add",
            isStatic: false,
            returnType: "int",
            parameters: [
                { name: "a", type: "int" },
                { name: "b", type: "int" }
            ]
        }
    });

    for (const file of generated.files) {
        console.log(`\n--- ${file.filePath} ---\n`);
        console.log(file.fileContent);
    }

    console.log("\nCompile:", generated.compileCommand ?? "Not required");
    console.log("Run:", generated.runCommand);
}