package backend.judge.dto.response;

public record TestCaseResult(
        Long testCaseId,
        String status,
        String actualOutput,
        String errorMessage,
        long runtimeMs,
        long memoryKb
) {}