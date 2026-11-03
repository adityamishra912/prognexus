package backend.judge.client;

import backend.judge.dto.request.JudgeExecutionRequest;
import backend.judge.dto.response.JudgeExecutionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class JudgeClient {

    private final RestClient restClient;

    public JudgeClient(
            RestClient.Builder builder,
            @Value("${judge.base-url}") String judgeBaseUrl
    ) {
        this.restClient = builder
                .baseUrl(judgeBaseUrl)
                .build();
    }

    public JudgeExecutionResponse execute(JudgeExecutionRequest request) {
        return restClient.post()
                .uri("/api/judge/execute")
                .body(request)
                .retrieve()
                .body(JudgeExecutionResponse.class);
    }
}