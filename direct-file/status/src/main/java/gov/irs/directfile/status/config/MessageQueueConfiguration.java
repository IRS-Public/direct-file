package gov.irs.directfile.status.config;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@AllArgsConstructor
@Getter
// See https://stackoverflow.com/a/67994421 for why we use kebab case here (message-queue)
// when we're using camel case (messageQueue) in the source.
@ConfigurationProperties("status.message-queue")
public class MessageQueueConfiguration {
    @NotBlank
    @URL
    private final String endpoint;

    @NotBlank
    private final String statusChangeQueue;

    @NotBlank
    private final String pendingSubmissionQueue;

    @NotBlank
    private final String dlqPendingSubmissionQueue;

    @NotBlank
    private final String region;

    private final boolean sqsMessageHandlingEnabled;

    private final boolean statusChangePublishEnabled;
}
