package backend.judge.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "problem_code_templates")
public class ProblemCodeTemplate {

    @Id
    private Long id;

    @Column(name = "problem_id", nullable = false, unique = true)
    private Long problemId;

    @Column(name = "java_starter_code", nullable = false,
            columnDefinition = "text")
    private String javaStarterCode;

    @Column(name = "python_starter_code", nullable = false,
            columnDefinition = "text")
    private String pythonStarterCode;

    @Column(name = "c_starter_code", nullable = false,
            columnDefinition = "text")
    private String cStarterCode;

    @Column(name = "cpp_starter_code", nullable = false,
            columnDefinition = "text")
    private String cppStarterCode;

    @Column(name = "entry_class", length = 100)
    private String entryClass;

    @Column(name = "entry_method", length = 100)
    private String entryMethod;

    @Column(name = "execution_mode", length = 30)
    private String executionMode;

    protected ProblemCodeTemplate() {}

    public Long getProblemId() { return problemId; }
    public String getEntryClass() { return entryClass; }
    public String getEntryMethod() { return entryMethod; }
    public String getExecutionMode() { return executionMode; }
}