package backend.judge.repository;

import backend.judge.entity.ProblemCodeTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProblemCodeTemplateRepository
        extends JpaRepository<ProblemCodeTemplate, Long> {

    Optional<ProblemCodeTemplate> findByProblemId(Long problemId);
}