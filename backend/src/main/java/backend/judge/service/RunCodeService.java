package backend.judge.service;

import backend.judge.client.JudgeClient;
import backend.judge.dto.request.JudgeExecutionRequest;
import backend.judge.dto.request.RunCodeRequest;
import backend.judge.dto.response.JudgeExecutionResponse;
import backend.judge.dto.response.RunCodeResponse;
import backend.judge.dto.response.TestCaseResult;
import backend.judge.entity.ProblemExecutionConfig;
import backend.judge.entity.ProblemJudgeConfig;
import backend.judge.entity.TestCase;
import backend.judge.repository.ProblemExecutionConfigRepository;
import backend.judge.repository.ProblemJudgeConfigRepository;
import backend.judge.repository.ProblemRepository;
import backend.judge.repository.TestCaseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class RunCodeService {

    private static final int REQUIRED_VISIBLE_TESTS = 3;

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final ProblemExecutionConfigRepository executionConfigRepository;
    private final ProblemJudgeConfigRepository judgeConfigRepository;
    private final JudgeClient judgeClient;

    public RunCodeService(
            ProblemRepository problemRepository,
            TestCaseRepository testCaseRepository,
            ProblemExecutionConfigRepository executionConfigRepository,
            ProblemJudgeConfigRepository judgeConfigRepository,
            JudgeClient judgeClient
    ) {
        this.problemRepository = problemRepository;
        this.testCaseRepository = testCaseRepository;
        this.executionConfigRepository = executionConfigRepository;
        this.judgeConfigRepository = judgeConfigRepository;
        this.judgeClient = judgeClient;
    }

    @Transactional(readOnly = true)
    public RunCodeResponse run(RunCodeRequest request) {

        // 1. Load problem.
        problemRepository.findById(request.problemId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Problem not found"
                ));

        // 2. Load execution configuration.
        ProblemExecutionConfig executionConfig =
                executionConfigRepository.findById(request.problemId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.UNPROCESSABLE_CONTENT,
                                "Execution configuration not found"
                        ));

        // 3. Load judge configuration.
        ProblemJudgeConfig judgeConfig =
                judgeConfigRepository.findByProblemId(request.problemId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.UNPROCESSABLE_CONTENT,
                                "Judge configuration not found"
                        ));

        // 4. Validate request.
        validateRequest(request, executionConfig);

        // 5. Fetch exactly three visible test cases.
        List<TestCase> testCases =
                testCaseRepository.findByProblemIdAndHiddenFalseOrderByIdAsc(
                        request.problemId()
                );

        if (testCases.size() != REQUIRED_VISIBLE_TESTS) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT,
                    "Expected exactly 3 visible test cases, found "
                            + testCases.size()
            );
        }

        // 6. Build submitted execution files.
        List<JudgeExecutionRequest.ExecutionFile> files =
                buildExecutionFiles(request, judgeConfig.getExecutionMode());

        // 7. Build test-case payload.
        List<JudgeExecutionRequest.ExecutionTestCase> judgeTestCases =
                testCases.stream()
                        .map(testCase ->
                                new JudgeExecutionRequest.ExecutionTestCase(
                                        testCase.getId(),
                                        testCase.getInputData()
                                )
                        )
                        .toList();

        // 8. Build Judge request.
        JudgeExecutionRequest judgeRequest =
                new JudgeExecutionRequest(
                        request.problemId(),
                        request.language().toLowerCase(Locale.ROOT),
                        files,
                        judgeTestCases,
                        judgeConfig.getExecutionMode(),
                        toMap(judgeConfig.getFunctionSpec()),
                        toMap(executionConfig.getExecutionConfig()),
                        executionConfig.getTimeLimitMs(),
                        executionConfig.getMemoryLimitMb()
                );

        // 9. Execute through Node Judge.
        JudgeExecutionResponse judgeResponse =
                judgeClient.execute(judgeRequest);

        if (judgeResponse == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Judge service returned an empty response"
            );
        }

        // 10. Validate and index execution results.
        Map<Long, JudgeExecutionResponse.ExecutionResult> executionResultMap =
                new HashMap<>();

        if (judgeResponse.results() != null) {

            for (JudgeExecutionResponse.ExecutionResult result
                    : judgeResponse.results()) {

                if (result.testCaseId() == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Judge returned a result without a test case ID"
                    );
                }

                if (testCases.stream().noneMatch(
                        testCase -> testCase.getId().equals(result.testCaseId())
                )) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Judge returned an unknown test case ID: "
                                    + result.testCaseId()
                    );
                }

                if (executionResultMap.putIfAbsent(
                        result.testCaseId(), result
                ) != null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Judge returned duplicate results for test case: "
                                    + result.testCaseId()
                    );
                }
            }
        }

        // 11. Match each execution result with its expected output.
        List<TestCaseResult> results = new ArrayList<>();

        for (TestCase testCase : testCases) {

            JudgeExecutionResponse.ExecutionResult executionResult =
                    executionResultMap.get(testCase.getId());

            if (executionResult == null) {

                String missingStatus = missingResultStatus(
                        judgeResponse.status()
                );

                results.add(new TestCaseResult(
                        testCase.getId(),
                        missingStatus,
                        "",
                        judgeResponse.compileError() != null
                                ? judgeResponse.compileError()
                                : "Judge did not return a result for this test case.",
                        null,
                        null
                ));

                continue;
            }

            String executionStatus = executionResult.status();

            String finalTestStatus;
            String errorMessage = executionResult.errorMessage();

            if ("COMPLETED".equalsIgnoreCase(executionStatus)) {

                // Compare actual output with expected output.
                boolean passed = compareOutput(
                        executionResult.actualOutput(),
                        testCase.getExpectedOutput(),
                        judgeConfig
                );

                finalTestStatus = passed ? "PASSED" : "FAILED";

            } else {

                // Preserve execution errors instead of treating them
                // as ordinary wrong answers.
                finalTestStatus = normalizeExecutionStatus(executionStatus);

                if ("COMPILE_ERROR".equals(finalTestStatus)
                        && (errorMessage == null || errorMessage.isBlank())) {
                    errorMessage = judgeResponse.compileError();
                }
            }

            results.add(new TestCaseResult(
                    testCase.getId(),
                    finalTestStatus,
                    executionResult.actualOutput(),
                    errorMessage,
                    executionResult.runtimeMs(),
                    null
            ));
        }

        // 12. Calculate passed test cases.
        int passed = (int) results.stream()
                .filter(result ->
                        "PASSED".equals(result.status()))
                .count();

        // 13. Determine overall submission status.
        String overallStatus = determineOverallStatus(
                judgeResponse.status(),
                results,
                passed
        );

        // 14. Use process-level metrics from Node Judge.
        long runtime = judgeResponse.runtimeMs() != null
                ? judgeResponse.runtimeMs()
                : 0L;

        long memory = judgeResponse.memoryKb() != null
                ? judgeResponse.memoryKb()
                : 0L;

        // 15. Return frontend-compatible response.
        return new RunCodeResponse(
                overallStatus,
                passed,
                REQUIRED_VISIBLE_TESTS,
                (passed * 100.0) / REQUIRED_VISIBLE_TESTS,
                runtime,
                memory,
                results
        );
    }

    private void validateRequest(
            RunCodeRequest request,
            ProblemExecutionConfig config
    ) {

        boolean hasCode = request.code() != null
                && !request.code().isBlank();

        boolean hasFiles = request.files() != null
                && !request.files().isEmpty();

        // Exactly one input form must be provided.
        if (hasCode == hasFiles) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Provide either code or files, not both"
            );
        }

        String language = request.language().toLowerCase(Locale.ROOT);

        // Validate allowed languages.
        JsonNode allowedLanguages = config.getAllowedLanguages();

        if (allowedLanguages != null && allowedLanguages.isArray()) {

            boolean allowed = false;

            for (JsonNode node : allowedLanguages) {
                if (language.equalsIgnoreCase(node.asText())) {
                    allowed = true;
                    break;
                }
            }

            if (!allowed) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Language is not allowed for this problem"
                );
            }
        }

        // Validate submitted files.
        if (hasFiles) {

            for (RunCodeRequest.CodeFile file : request.files()) {

                if (file.file_content() == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "File content cannot be null"
                    );
                }
            }
        }
    }

    private List<JudgeExecutionRequest.ExecutionFile> buildExecutionFiles(
            RunCodeRequest request,
            String executionMode
    ) {

        if (request.files() != null && !request.files().isEmpty()) {

            return request.files().stream()
                    .map(file ->
                            new JudgeExecutionRequest.ExecutionFile(
                                    file.file_path(),
                                    file.file_content(),
                                    file.language()
                            )
                    )
                    .toList();
        }

        String language = request.language().toLowerCase(Locale.ROOT);

        // Java FUNCTION mode expects Solution.java because
        // the generated Java harness instantiates Solution.
        String fileName;

        if ("java".equals(language)
                && "FUNCTION".equalsIgnoreCase(executionMode)) {
            fileName = "Solution.java";
        } else {
            fileName = "Main." + extension(language);
        }

        return List.of(
                new JudgeExecutionRequest.ExecutionFile(
                        fileName,
                        request.code(),
                        language
                )
        );
    }

    private String extension(String language) {

        return switch (language.toLowerCase(Locale.ROOT)) {
            case "java" -> "java";
            case "python" -> "py";
            case "c" -> "c";
            case "cpp", "c++" -> "cpp";

            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported language: " + language
            );
        };
    }

    private String missingResultStatus(String judgeStatus) {

        if (judgeStatus == null) {
            return "EXECUTION_ERROR";
        }

        return switch (judgeStatus.toUpperCase(Locale.ROOT)) {
            case "COMPILE_ERROR" -> "COMPILE_ERROR";
            case "TIME_LIMIT_EXCEEDED" -> "TIME_LIMIT_EXCEEDED";
            default -> "EXECUTION_ERROR";
        };
    }

    private String normalizeExecutionStatus(String status) {

        if (status == null) {
            return "EXECUTION_ERROR";
        }

        return switch (status.toUpperCase(Locale.ROOT)) {
            case "COMPILE_ERROR" -> "COMPILE_ERROR";
            case "TIME_LIMIT_EXCEEDED" -> "TIME_LIMIT_EXCEEDED";
            case "RUNTIME_ERROR" -> "RUNTIME_ERROR";
            case "EXECUTION_ERROR" -> "EXECUTION_ERROR";
            default -> "EXECUTION_ERROR";
        };
    }

    private String determineOverallStatus(
            String judgeStatus,
            List<TestCaseResult> results,
            int passed
    ) {

        // Respect global execution failures first.
        if (judgeStatus != null) {

            switch (judgeStatus.toUpperCase(Locale.ROOT)) {
                case "COMPILE_ERROR":
                    return "COMPILE_ERROR";

                case "TIME_LIMIT_EXCEEDED":
                    return "TIME_LIMIT_EXCEEDED";

                case "EXECUTION_ERROR":
                    return "EXECUTION_ERROR";
            }
        } else {
            return "EXECUTION_ERROR";
        }

        // Inspect individual test-case statuses.
        boolean hasTimeout = results.stream()
                .anyMatch(result ->
                        "TIME_LIMIT_EXCEEDED".equals(result.status()));

        boolean hasCompileError = results.stream()
                .anyMatch(result ->
                        "COMPILE_ERROR".equals(result.status()));

        boolean hasRuntimeError = results.stream()
                .anyMatch(result ->
                        "RUNTIME_ERROR".equals(result.status()));

        boolean hasExecutionError = results.stream()
                .anyMatch(result ->
                        "EXECUTION_ERROR".equals(result.status()));

        if (hasTimeout) return "TIME_LIMIT_EXCEEDED";
        if (hasCompileError) return "COMPILE_ERROR";
        if (hasRuntimeError) return "RUNTIME_ERROR";
        if (hasExecutionError) return "EXECUTION_ERROR";

        return passed == REQUIRED_VISIBLE_TESTS
                ? "ACCEPTED"
                : "WRONG_ANSWER";
    }

    private Map<String, Object> toMap(JsonNode node) {

        if (node == null || node.isNull()) {
            return Map.of();
        }

        if (!node.isObject()) {
            throw new IllegalArgumentException(
                    "Configuration must be a JSON object"
            );
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();

        node.fields().forEachRemaining(entry ->
                result.put(entry.getKey(), toJavaValue(entry.getValue()))
        );

        return result;
    }

    private Object toJavaValue(JsonNode node) {

        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isObject()) {
            return toMap(node);
        }

        if (node.isArray()) {
            List<Object> values = new ArrayList<>();
            node.forEach(value -> values.add(toJavaValue(value)));
            return values;
        }

        if (node.isTextual()) {
            return node.asText();
        }

        if (node.isBoolean()) {
            return node.asBoolean();
        }

        if (node.isNumber()) {
            return node.numberValue();
        }

        return node.asText();
    }

    private boolean compareOutput(
        String actual,
        String expected,
        ProblemJudgeConfig judgeConfig
    ) {
        String checkerType = judgeConfig.getCheckerType();

        if (checkerType == null || "EXACT".equalsIgnoreCase(checkerType)) {
                return Objects.equals(actual, expected);
        }

        if ("NORMALIZED".equalsIgnoreCase(checkerType)) {
                return normalize(actual).equals(normalize(expected));
        }

        throw new ResponseStatusException(
                HttpStatus.NOT_IMPLEMENTED,
                "Checker type not implemented yet: " + checkerType
        );
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String normalize(String value) {
        if (value == null) {
                return "";
        }

        return value.trim()
            .replaceAll("\\s+", " ")
            .replaceAll("\\s*([,\\[\\]{}:])\\s*", "$1");
    }
}