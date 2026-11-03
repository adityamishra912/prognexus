package backend.judge.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "problem_judge_config")
public class ProblemJudgeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "problem_id", unique = true, nullable = false)
    private Long problemId;

    @Column(name = "execution_mode", length = 30)
    private String executionMode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "function_spec", columnDefinition = "jsonb")
    private JsonNode functionSpec;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "language_configs", columnDefinition = "jsonb")
    private JsonNode languageConfigs;

    @Column(name = "checker_type", length = 30)
    private String checkerType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "checker_config", columnDefinition = "jsonb")
    private JsonNode checkerConfig;

    protected ProblemJudgeConfig() {}

    public Long getProblemId() { return problemId; }
    public String getExecutionMode() { return executionMode; }
    public JsonNode getFunctionSpec() { return functionSpec; }
    public JsonNode getLanguageConfigs() { return languageConfigs; }
    public String getCheckerType() { return checkerType; }
    public JsonNode getCheckerConfig() { return checkerConfig; }
}