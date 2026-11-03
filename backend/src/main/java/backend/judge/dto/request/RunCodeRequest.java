package backend.judge.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RunCodeRequest(

        @NotNull
        @Positive
        Long problemId,

        @NotBlank
        String language,

        String code,

        @Valid
        @Size(max = 20)
        List<CodeFile> files

) {
    public record CodeFile(
            @NotBlank String file_path,
            String file_content,
            @NotBlank String language
    ) {}
}