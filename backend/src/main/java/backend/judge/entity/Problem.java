package backend.judge.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "problems")
public class Problem {

    @Id
    private Long id;

    @Column(name = "problem_number")
    private Integer problemNumber;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String slug;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "type_id")
    private Long typeId;

    @Column(length = 20)
    private String difficulty;

    @Column(name = "is_published")
    private Boolean published;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    protected Problem() {}

    public Long getId() { return id; }
    public Long getTypeId() { return typeId; }
    public String getTitle() { return title; }
}