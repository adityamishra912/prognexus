
package backend.judge.dto.request;

import java.util.List;
import java.util.Map;

public record JudgeExecutionRequest(
        Long problemId,
        String language,
        List<ExecutionFile> files,
        List<ExecutionTestCase> testCases,
        String executionMode,
        Map<String, Object> functionSpec,
        Map<String, Object> executionConfig,
        Integer timeLimitMs,
        Integer memoryLimitMb
) {
    public record ExecutionFile(
            String filePath,
            String fileContent,
            String language
    ) {}

    public record ExecutionTestCase(
            Long testCaseId,
            String input
    ) {}
}