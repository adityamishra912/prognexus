package backend.judge.repository;

import backend.judge.entity.ProblemFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProblemFileRepository
        extends JpaRepository<ProblemFile, Long> {

    List<ProblemFile> findByProblemIdOrderByIdAsc(Long problemId);
}