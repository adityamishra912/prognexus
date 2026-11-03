package backend.judge.repository;

import backend.judge.entity.ProblemExecutionConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemExecutionConfigRepository
        extends JpaRepository<ProblemExecutionConfig, Long> {
}