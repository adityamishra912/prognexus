package backend.judge.dto.response;

import java.util.List;

public record RunCodeResponse(
        String status,
        int testsPassed,
        int testsTotal,
        double accuracyScore,
        long runtimeMs,
        long memoryKb,
        List<TestCaseResult> testResults
) {}