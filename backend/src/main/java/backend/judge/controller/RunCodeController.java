package backend.judge.controller;

import backend.judge.dto.request.RunCodeRequest;
import backend.judge.dto.response.RunCodeResponse;
import backend.judge.service.RunCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RunCodeController {

    private final RunCodeService runCodeService;

    public RunCodeController(RunCodeService runCodeService) {
        this.runCodeService = runCodeService;
    }

    @PostMapping("/run")
    public ResponseEntity<RunCodeResponse> runCode(
            @Valid @RequestBody RunCodeRequest request
    ) {
        // Print incoming request
        System.out.println("\n========== INCOMING REQUEST ==========");
        System.out.println(request);
        System.out.println("======================================");

        // Execute service
        RunCodeResponse response = runCodeService.run(request);

        // Print outgoing response
        System.out.println("\n========== OUTGOING RESPONSE ==========");
        System.out.println(response);
        System.out.println("======================================\n");
        
        return ResponseEntity.ok(response);
    }
}