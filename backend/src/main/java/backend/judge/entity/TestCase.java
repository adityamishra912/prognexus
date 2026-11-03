package backend.judge.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "test_cases")
public class TestCase {

    @Id
    private Long id;

    @Column(name = "problem_id", nullable = false)
    private Long problemId;

    @Column(name = "input_data", columnDefinition = "text")
    private String inputData;

    @Column(name = "expected_output", nullable = false,
            columnDefinition = "text")
    private String expectedOutput;

    @Column(name = "is_hidden")
    private Boolean hidden;

    private Integer weight;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    protected TestCase() {}

    public Long getId() { return id; }
    public Long getProblemId() { return problemId; }
    public String getInputData() { return inputData; }
    public String getExpectedOutput() { return expectedOutput; }
    public Boolean isHidden() { return hidden; }
    public Integer getWeight() { return weight; }
}