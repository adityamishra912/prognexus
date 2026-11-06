
export type SupportedLanguage = "java" | "python" | "c" | "cpp";

export type ExecutionMode = "FUNCTION" | "STDIN";

export type SupportedDataType =
    | "integer"
    | "long"
    | "double"
    | "boolean"
    | "string"
    | "array";

export type FunctionArgument = {
    name: string;
    type: SupportedDataType;
    position: number;
    element_type?: SupportedDataType;
};

export type FunctionReturn = {
    type: SupportedDataType;
    element_type?: SupportedDataType;
};

export type FunctionSpec = {
    function_name: string;
    arguments: FunctionArgument[];
    return: FunctionReturn;
};

export type HarnessFile = {
    filePath: string;
    fileContent: string;
    language: SupportedLanguage;
};

export type HarnessTestCase = {
    testCaseId: number;
    input: string;
};

export type HarnessInput = {
    language: SupportedLanguage;
    executionMode: ExecutionMode;
    files: HarnessFile[];
    testCases: HarnessTestCase[];
    functionSpec?: FunctionSpec;
};

export type GeneratedHarness = {
    files: HarnessFile[];
    entryPoint: string;
    compileCommand?: string;
    runCommand: string;
};