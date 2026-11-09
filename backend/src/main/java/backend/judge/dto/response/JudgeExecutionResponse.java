package backend.judge.dto.response;

import java.util.List;

public record JudgeExecutionResponse(
        String status,
        Long runtimeMs,
        Long memoryKb,
        String compileError,
        List<ExecutionResult> results
) {
    public record ExecutionResult(
            Long testCaseId,
            String status,
            String actualOutput,
            String stdout,
            String errorMessage,
            Long runtimeMs
    ) {}
}