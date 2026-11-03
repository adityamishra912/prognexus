package backend.judge.controller;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DatabaseTestController {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseTestController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/test/database")
    public Map<String, Object> testDatabase() {

        Map<String, Object> result = jdbcTemplate.queryForMap("""
            SELECT
                current_database() AS database,
                current_user AS username,
                NOW() AS server_time
        """);

        return Map.of(
            "success", true,
            "message", "Supabase database connection successful",
            "data", result
        );
    }

    @GetMapping("/api/test/problems")
    public List<Map<String, Object>> getProblems() {
        return jdbcTemplate.queryForList("""
            SELECT id, problem_number, title, slug, difficulty
            FROM problems
            ORDER BY problem_number ASC
            LIMIT 10
        """);
    }
}