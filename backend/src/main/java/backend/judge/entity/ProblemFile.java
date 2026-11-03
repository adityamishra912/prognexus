package backend.judge.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "problem_files")
public class ProblemFile {

    @Id
    private Long id;

    @Column(name = "problem_id", nullable = false)
    private Long problemId;

    @Column(name = "file_path", nullable = false, columnDefinition = "text")
    private String filePath;

    @Column(name = "file_content", columnDefinition = "text")
    private String fileContent;

    @Column(length = 50)
    private String language;

    @Column(name = "is_editable")
    private Boolean editable;

    @Column(name = "is_entry_point")
    private Boolean entryPoint;

    protected ProblemFile() {}

    public Long getId() { return id; }
    public Long getProblemId() { return problemId; }
    public String getFilePath() { return filePath; }
    public String getFileContent() { return fileContent; }
    public String getLanguage() { return language; }
    public Boolean isEditable() { return editable; }
    public Boolean isEntryPoint() { return entryPoint; }
}