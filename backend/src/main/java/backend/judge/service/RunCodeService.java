package backend.judge.service;

import backend.judge.client.JudgeClient;
import backend.judge.dto.request.JudgeExecutionRequest;
import backend.judge.dto.request.RunCodeRequest;
import backend.judge.dto.response.JudgeExecutionResponse;
import backend.judge.dto.response.RunCodeResponse;
import backend.judge.dto.response.TestCaseResult;
import backend.judge.entity.Problem;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

        // 1. Load problem
        problemRepository.findById(request.problemId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Problem not found"
                ));

        // 2. Load execution configuration
        ProblemExecutionConfig executionConfig =
                executionConfigRepository.findById(request.problemId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.UNPROCESSABLE_CONTENT,
                                "Execution configuration not found"
                        ));

        // 3. Load judge configuration
        ProblemJudgeConfig judgeConfig =
                judgeConfigRepository.findByProblemId(request.problemId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.UNPROCESSABLE_CONTENT,
                                "Judge configuration not found"
                        ));

        // 4. Validate request
        validateRequest(request, executionConfig);

        // 5. Fetch exactly three visible test cases
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

        // 6. Build execution files
        List<JudgeExecutionRequest.ExecutionFile> files =
                buildExecutionFiles(request);

        // 7. Build test-case payload
        List<JudgeExecutionRequest.ExecutionTestCase> judgeTestCases =
                testCases.stream()
                        .map(testCase ->
                                new JudgeExecutionRequest.ExecutionTestCase(
                                        testCase.getId(),
                                        testCase.getInputData()
                                )
                        )
                        .toList();

        // 8. Build Judge request
        JudgeExecutionRequest judgeRequest =
        new JudgeExecutionRequest(
                request.problemId(),
                request.language().toLowerCase(),
                files,
                judgeTestCases,
                judgeConfig.getExecutionMode(),
                toMap(judgeConfig.getFunctionSpec()),
                toMap(executionConfig.getExecutionConfig()),
                executionConfig.getTimeLimitMs(),
                executionConfig.getMemoryLimitMb()
        );

        // 9. Execute through Node Judge service
        JudgeExecutionResponse judgeResponse =
                judgeClient.execute(judgeRequest);

        if (judgeResponse == null || judgeResponse.results() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Judge service returned an empty response"
            );
        }

        // 10. Index expected test cases
        Map<Long, TestCase> testCaseMap = testCases.stream()
                .collect(Collectors.toMap(
                        TestCase::getId,
                        testCase -> testCase
                ));

        List<TestCaseResult> results = new ArrayList<>();

        for (JudgeExecutionResponse.ExecutionResult executionResult
                : judgeResponse.results()) {

            TestCase testCase = testCaseMap.get(
                    executionResult.testCaseId()
            );

            if (testCase == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Judge returned an unknown test case ID"
                );
            }

            String status = executionResult.status();

            if ("COMPLETED".equalsIgnoreCase(status)) {
                boolean passed = compareOutput(
                        executionResult.actualOutput(),
                        testCase.getExpectedOutput(),
                        judgeConfig
                );

                status = passed ? "PASSED" : "FAILED";
            }

            results.add(new TestCaseResult(
                    executionResult.testCaseId(),
                    status,
                    executionResult.actualOutput(),
                    executionResult.errorMessage(),
                    executionResult.runtimeMs(),
                    executionResult.memoryKb()
            ));
        }

        // Ensure exactly three distinct results were returned
        long distinctResults = results.stream()
                .map(TestCaseResult::testCaseId)
                .distinct()
                .count();

        if (results.size() != REQUIRED_VISIBLE_TESTS
                || distinctResults != REQUIRED_VISIBLE_TESTS) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Judge must return exactly one result for each of the three visible test cases"
            );
        }

        // 11. Aggregate results
        int passed = (int) results.stream()
                .filter(result ->
                        "PASSED".equalsIgnoreCase(result.status()))
                .count();

        long runtime = results.stream()
                .mapToLong(TestCaseResult::runtimeMs)
                .sum();

        long memory = results.stream()
                .mapToLong(TestCaseResult::memoryKb)
                .max()
                .orElse(0);

        String overallStatus =
                passed == REQUIRED_VISIBLE_TESTS
                        ? "ACCEPTED"
                        : "WRONG_ANSWER";

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

        // Exactly one input form must be provided
        if (hasCode == hasFiles) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Provide either code or files, not both"
            );
        }

        String language = request.language().toLowerCase();

        // Validate allowed languages
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

        // Validate development files
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
            RunCodeRequest request
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

        return List.of(
                new JudgeExecutionRequest.ExecutionFile(
                        "Main." + extension(request.language()),
                        request.code(),
                        request.language()
                )
        );
    }

    private String extension(String language) {
        return switch (language.toLowerCase()) {
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

    private Map<String, Object> toMap(JsonNode node) {
    if (node == null || node.isNull()) {
        return Map.of();
    }

    if (!node.isObject()) {
        throw new IllegalArgumentException(
                "Execution configuration must be a JSON object"
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

        // Initial implementation: normalized exact comparison
        if (checkerType == null
                || "EXACT".equalsIgnoreCase(checkerType)
                || "NORMALIZED".equalsIgnoreCase(checkerType)) {

            return normalize(actual).equals(normalize(expected));
        }

        throw new ResponseStatusException(
                HttpStatus.NOT_IMPLEMENTED,
                "Checker type not implemented yet: " + checkerType
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().replaceAll("\\s+", " ");
    }
}