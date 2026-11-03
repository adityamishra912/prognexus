package backend.judge.repository;

import backend.judge.entity.ProblemType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemTypeRepository
        extends JpaRepository<ProblemType, Long> {
}