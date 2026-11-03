package backend.judge.repository;

import backend.judge.entity.ProblemJudgeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProblemJudgeConfigRepository
        extends JpaRepository<ProblemJudgeConfig, Long> {

    Optional<ProblemJudgeConfig> findByProblemId(Long problemId);
}