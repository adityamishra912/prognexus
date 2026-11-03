package backend.judge.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "problem_types")
public class ProblemType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    protected ProblemType() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
}