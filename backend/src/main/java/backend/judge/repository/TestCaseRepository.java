package backend.judge.repository;

import backend.judge.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {

    List<TestCase> findByProblemIdAndHiddenFalseOrderByIdAsc(Long problemId);
}