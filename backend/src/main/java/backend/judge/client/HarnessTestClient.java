package backend.judge.client;

import backend.judge.dto.request.JudgeExecutionRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class HarnessTestClient {

    private final RestClient restClient;

    public HarnessTestClient(
            RestClient.Builder builder,
            @Value("${judge.base-url:http://localhost:4000}") String baseUrl
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .build();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> generateHarness(JudgeExecutionRequest request) {
        Map<String, Object> response = restClient.post()
                .uri("/api/judge/execute")
                .body(request)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException("Judge service returned an empty response.");
        }

        return response;
    }
}