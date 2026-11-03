package backend.judge.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "problem_execution_config")
public class ProblemExecutionConfig {

    @Id
    @Column(name = "problem_id")
    private Long problemId;

    @Column(name = "time_limit_ms")
    private Integer timeLimitMs;

    @Column(name = "memory_limit_mb")
    private Integer memoryLimitMb;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_languages", columnDefinition = "jsonb")
    private JsonNode allowedLanguages;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "execution_config", columnDefinition = "jsonb")
    private JsonNode executionConfig;

    protected ProblemExecutionConfig() {}

    public Long getProblemId() { return problemId; }
    public Integer getTimeLimitMs() { return timeLimitMs; }
    public Integer getMemoryLimitMb() { return memoryLimitMb; }
    public JsonNode getAllowedLanguages() { return allowedLanguages; }
    public JsonNode getExecutionConfig() { return executionConfig; }
}