package gov.irs.directfile.status.acknowledgement;

import java.util.List;
import java.util.UUID;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import gov.irs.directfile.audit.AuditEventData;
import gov.irs.directfile.audit.AuditLogElement;
import gov.irs.directfile.audit.AuditService;
import gov.irs.directfile.audit.events.Event;
import gov.irs.directfile.audit.events.EventId;
import gov.irs.directfile.audit.events.EventStatus;
import gov.irs.directfile.audit.events.SystemEventPrincipal;
import gov.irs.directfile.models.RejectedStatus;
import gov.irs.directfile.status.acknowledgement.domain.AcknowledgementStatus;

@SuppressFBWarnings(
        value = {"CRLF_INJECTION_LOGS"},
        justification = "Initial SpotBugs Setup")
@RestController
@Validated
@Slf4j
@RequestMapping("/status")
public class AcknowledgementController {

    private static String X_FORWARDED_FOR = "X-Forwarded-For";

    @SuppressFBWarnings(
            value = {"EI_EXPOSE_REP2"},
            justification = "constructor injection")
    public AcknowledgementController(AcknowledgementService acknowledgementService) {
        this.acknowledgementService = acknowledgementService;
    }

    private final AcknowledgementService acknowledgementService;
    private static final AuditService auditService = new AuditService();

    @GetMapping()
    public ResponseEntity<AcknowledgementStatus> get(
            @RequestParam(name = "id") UUID taxReturnId, HttpServletRequest request) {
        AuditEventData eventData = new AuditEventData();
        String submissionId = null;
        try {
            MDC.put(AuditLogElement.taxReturnId.toString(), taxReturnId.toString());
            log.info(String.format("Request for taxReturnId %s", taxReturnId));
            MDC.clear();

            submissionId =
                    acknowledgementService.getLatestSubmissionIdByTaxReturnIdPreferringAcceptedSubmission(taxReturnId);
            AcknowledgementStatus acknowledgementStatus =
                    acknowledgementService.GetAcknowledgement(taxReturnId, submissionId);

            submissionId = setSubmissionIdToUnknownStringIfItIsNullSoThatLogMessagesWillBeMoreClear(submissionId);

            MDC.put(AuditLogElement.mefSubmissionId.toString(), submissionId);
            log.info(String.format("Retrieved submissionId %s", submissionId));
            MDC.clear();

            if (acknowledgementStatus == null) {
                addValuesToEventData(eventData, AuditLogElement.mefSubmissionId, submissionId);
                addValuesToEventData(eventData, AuditLogElement.taxReturnId, taxReturnId.toString());
                addValuesToEventData(
                        eventData, AuditLogElement.responseStatusCode, String.valueOf(HttpStatus.NOT_FOUND.value()));

                auditService.performLogFromEvent(
                        Event.builder()
                                .eventId(EventId.CHECK)
                                .eventStatus(EventStatus.FAILURE)
                                .eventPrincipal(new SystemEventPrincipal())
                                .build(),
                        eventData);
                return new ResponseEntity<AcknowledgementStatus>(HttpStatus.NOT_FOUND);
            }
            // this will get logged every time /status is hit, regardless of whether submissionId is found
            addValuesToEventData(eventData, AuditLogElement.mefSubmissionId, submissionId);
            addValuesToEventData(eventData, AuditLogElement.taxReturnId, taxReturnId.toString());
            addValuesToEventData(eventData, AuditLogElement.responseStatusCode, String.valueOf(HttpStatus.OK.value()));

            auditService.performLogFromEvent(
                    Event.builder()
                            .eventId(EventId.CHECK)
                            .eventStatus(EventStatus.SUCCESS)
                            .eventPrincipal(new SystemEventPrincipal())
                            .build(),
                    eventData);
            return new ResponseEntity<>(acknowledgementStatus, HttpStatus.OK);

        } catch (Exception ex) {
            eventData.put(AuditLogElement.eventErrorMessage, ex.getClass().getName());
            eventData.putDetail("errorMessage", ex.getMessage());
            addValuesToEventData(eventData, AuditLogElement.mefSubmissionId, submissionId);
            addValuesToEventData(eventData, AuditLogElement.taxReturnId, taxReturnId.toString());
            addValuesToEventData(
                    eventData, AuditLogElement.responseStatusCode, String.valueOf(HttpStatus.BAD_REQUEST.value()));

            auditService.performLogFromEvent(
                    Event.builder()
                            .eventId(EventId.CHECK)
                            .eventStatus(EventStatus.FAILURE)
                            .eventPrincipal(new SystemEventPrincipal())
                            .build(),
                    eventData);
            MDC.put(AuditLogElement.taxReturnId.toString(), taxReturnId.toString());
            MDC.put(AuditLogElement.mefSubmissionId.toString(), submissionId);
            log.error(String.format("Error handling submission id %s", taxReturnId), ex);
            MDC.clear();
            return new ResponseEntity<AcknowledgementStatus>(HttpStatus.BAD_REQUEST);
        } finally {
            MDC.clear();
        }
    }

    @GetMapping("/rejection-codes")
    public ResponseEntity<List<RejectedStatus>> getRejectionCodes(
            @RequestParam(name = "submissionId") String submissionId, HttpServletRequest request) {
        AuditEventData eventData = new AuditEventData();
        try {
            MDC.put(AuditLogElement.mefSubmissionId.toString(), submissionId);
            MDC.clear();

            List<RejectedStatus> rejectionCodes;
            try {
                rejectionCodes = acknowledgementService.getRejectionCodesForSubmissionId(submissionId);
            } catch (EntityNotFoundException e) {
                log.error(String.format("Could not find record for submission ID %s", submissionId), e);
                addValuesToEventData(eventData, AuditLogElement.mefSubmissionId, submissionId);
                addValuesToEventData(
                        eventData, AuditLogElement.responseStatusCode, String.valueOf(HttpStatus.NOT_FOUND.value()));

                auditService.performLogFromEvent(
                        Event.builder()
                                .eventId(EventId.CHECK)
                                .eventStatus(EventStatus.FAILURE)
                                .eventPrincipal(new SystemEventPrincipal())
                                .build(),
                        eventData);
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            MDC.put(AuditLogElement.mefSubmissionId.toString(), submissionId);
            MDC.clear();

            // this will get logged every time /status is hit, regardless of whether submissionId is found
            addValuesToEventData(eventData, AuditLogElement.mefSubmissionId, submissionId);
            addValuesToEventData(eventData, AuditLogElement.responseStatusCode, String.valueOf(HttpStatus.OK.value()));

            auditService.performLogFromEvent(
                    Event.builder()
                            .eventId(EventId.CHECK)
                            .eventStatus(EventStatus.SUCCESS)
                            .eventPrincipal(new SystemEventPrincipal())
                            .build(),
                    eventData);
            return new ResponseEntity<>(rejectionCodes, HttpStatus.OK);

        } catch (Exception ex) {
            eventData.put(AuditLogElement.eventErrorMessage, ex.getClass().getName());
            eventData.putDetail("errorMessage", ex.getMessage());
            addValuesToEventData(eventData, AuditLogElement.mefSubmissionId, submissionId);
            addValuesToEventData(
                    eventData, AuditLogElement.responseStatusCode, String.valueOf(HttpStatus.BAD_REQUEST.value()));

            auditService.performLogFromEvent(
                    Event.builder()
                            .eventId(EventId.CHECK)
                            .eventStatus(EventStatus.FAILURE)
                            .eventPrincipal(new SystemEventPrincipal())
                            .build(),
                    eventData);
            MDC.put(AuditLogElement.mefSubmissionId.toString(), submissionId);
            log.error(String.format("Error handling submission id %s", submissionId), ex);
            MDC.clear();
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } finally {
            MDC.clear();
        }
    }

    private void addValuesToEventData(AuditEventData auditEventData, AuditLogElement key, String value) {
        if (value != null) {
            auditEventData.put(key, value);
        }
    }

    // This is a bit of workaround to make our log messages more clear.
    // If submissionId is null, that means the status app could not find a submission associated with the given
    // taxreturn in the TaxReturnSubmission table.
    // If no submission was found in the TaxReturnSubmission, that likely means that the status app is still waiting for
    // a message from the pending submission queue.
    // There is currently some logic based on a config property in getAcknowledgementStatus. This logic causes
    // GetAcknowledgement to return PENDING if submissionId is null,
    // and the statusEndpointReturnsPendingByDefaultEnabled property is true (which it currently is in PROD).
    // Without this workaround, submissionId will not appear in our logs, which was causing confusion.
    // I am setting submissionId to NOT_YET_KNOWN so that we can have a more clear understanding of what is happening
    // when we see our logs.
    private String setSubmissionIdToUnknownStringIfItIsNullSoThatLogMessagesWillBeMoreClear(String submissionId) {
        if (submissionId == null) {
            return "NOT_YET_KNOWN";
        } else {
            return submissionId;
        }
    }
}
