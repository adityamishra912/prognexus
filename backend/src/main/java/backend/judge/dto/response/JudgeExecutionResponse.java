package backend.judge.dto.response;

import java.util.List;

public record JudgeExecutionResponse(
        List<ExecutionResult> results
) {
    public record ExecutionResult(
            Long testCaseId,
            String status,
            String actualOutput,
            String errorMessage,
            Long runtimeMs,
            Long memoryKb
    ) {}
}