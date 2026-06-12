package gov.irs.directfile.submit.service;

import java.time.*;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import lombok.SneakyThrows;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import gov.irs.mef.inputcomposition.BinaryAttachment;
import gov.irs.mef.inputcomposition.SubmissionContainer;
import gov.irs.mef.inputcomposition.SubmissionManifest;
import gov.irs.mef.inputcomposition.SubmissionXML;

import gov.irs.directfile.audit.events.TinType;
import gov.irs.directfile.submit.BatchingProperties;
import gov.irs.directfile.submit.Runner;
import gov.irs.directfile.submit.actions.ActionContext;
import gov.irs.directfile.submit.actions.BundleArchivesActionHandler;
import gov.irs.directfile.submit.actions.CleanupActionHandler;
import gov.irs.directfile.submit.actions.CreateArchiveActionHandler;
import gov.irs.directfile.submit.actions.results.BundleArchivesActionResult;
import gov.irs.directfile.submit.command.ActionType;
import gov.irs.directfile.submit.command.CreateArchiveAction;
import gov.irs.directfile.submit.command.SubmitBundleAction;
import gov.irs.directfile.submit.config.Config;
import gov.irs.directfile.submit.config.DirectoriesConfig;
import gov.irs.directfile.submit.domain.*;
import gov.irs.directfile.submit.mocks.FakeSynchronousDocumentStorageService;
import gov.irs.directfile.submit.mocks.MutableTestClock;
import gov.irs.directfile.submit.mocks.ThrowingBundleSubmissionActionHandler;
import gov.irs.directfile.submit.repository.DocumentStorageBatchRepository;
import gov.irs.directfile.submit.repository.PodIdentifierRepository;
import gov.irs.directfile.submit.service.interfaces.IBundleSubmissionActionHandler;
import gov.irs.directfile.submit.service.interfaces.ISubmissionFailureService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ErrorHandlingIntegrationTest {

    // NOTE: Needed because we're mocking MEF Classes. MeF SDK expects this env variable A2A_TOOLKIT_HOME to be defined
    @BeforeAll
    public static void setupSystemProperties() {
        String userDirectory = System.getProperty("user.dir");
        System.setProperty("A2A_TOOLKIT_HOME", userDirectory + "/src/test/resources/");
    }

    @AfterAll
    public static void cleanupSystemProperties() {
        System.clearProperty("A2A_TOOLKIT_HOME");
    }

    @Mock
    private SqsConnectionSetupService sqsConnectionSetupService;

    @Mock
    private SubmissionConfirmationMessageService submissionConfirmationMessageService;

    private static final String APPLICATION_ID = "application-id";

    private ActionQueue actions = new ActionQueue();
    private Set<SubmissionBatch> inProgressBatches = new HashSet<>();

    private ActionHandler actionHandler;
    private ISubmissionFailureService submissionFailureService;

    private FakeSynchronousDocumentStorageService documentStorageService;
    private IBundleSubmissionActionHandler bundleSubmissionService;
    private DocumentStorageBatchRepository documentStorageBatchRepository;

    private final Config config = createConfig();
    private ErrorBatchPoller subject;

    private Runner runner;
    private OfflineModeService offlineMode;

    private final ActionContext context = new ActionContext(config);
    private Clock sharedClock;

    @Mock
    PodIdentifierRepository podIdentifierRepository;

    @BeforeEach
    public void setup() {
        // 1. Initialize services that need to be registered by the services container
        var date = LocalDateTime.of(2050, 11, 5, 12, 12);

        var instant = date.toInstant(ZoneOffset.UTC);
        sharedClock = new MutableTestClock(instant, ZoneId.of("UTC"));

        documentStorageService = new FakeSynchronousDocumentStorageService(sharedClock);
        submissionFailureService =
                new DocumentStorageSubmissionFailureService(documentStorageService, APPLICATION_ID, sharedClock);
        bundleSubmissionService = new ThrowingBundleSubmissionActionHandler();

        // 2. Initialize ErrorBatchPoller, and ActionHandler
        SqsConnectionSetupService sqsConnectionSetupService = null;
        ActionContext actionContext = new ActionContext(config);
        documentStorageBatchRepository = new DocumentStorageBatchRepository(
                documentStorageService,
                APPLICATION_ID,
                BatchingProperties.builder().build(),
                sharedClock);
        subject = new ErrorBatchPoller(
                actions, documentStorageService, APPLICATION_ID, inProgressBatches, context, sharedClock);
        offlineMode = new OfflineModeService();
        actionHandler = new ActionHandler(
                sqsConnectionSetupService,
                submissionConfirmationMessageService,
                actions,
                actionContext,
                bundleSubmissionService,
                offlineMode,
                inProgressBatches,
                new BundleArchivesActionHandler(actionContext),
                new CleanupActionHandler(actionContext, documentStorageService),
                new CreateArchiveActionHandler(actionContext, documentStorageService),
                new DocumentStorageSubmissionFailureService(documentStorageService, APPLICATION_ID, sharedClock),
                podIdentifierRepository);
        runner = new Runner(actions, actionHandler, offlineMode);
    }

    @AfterEach
    public void teardown() {
        actions.getInProgressActions().clear();
        actions.getNewActions().clear();
        inProgressBatches.clear();
        ;
    }

    @Test
    public void itPollsBatchesWithErrorsAndSubmitsThemForProcessing() throws Exception {
        /**
         * This test walks through the workflow of handling a batch of submissions
         * that fails to submit to MeF. Note that submission failure is distinct from a submission being rejected.
         * A submission failure means some error occurred that prevented us from submitting to MeF entirely.
         *
         * Flow of this test:
         * 1. Create a Batch that contains 2 submissions
         * 2. Add a SubmitBundleAction to the queue, and let the actionHandler handle the Action.
         *      addendum: We've setup the BundleSubmissionService to throw an exception to trigger the SubmissionFailure flow
         * 3. The SubmissionFailureAction is processed, copying over files to an error path to be processed later.
         *
         * 5. Manually call ErrorBatchPoller.poll(), polls the DocumentStore for any error batches.
         *      For failed batches, it enqueues 1 batch per submission.
         * 6. Expect that the actionQueue now has 2 archive actions. 1 for each submission in the batch from step 1
         * */
        // Arrange: Create a batch, and add submission data for two submissions to it.

        // 1. Create a batch with two submissions and add them to document storage
        long batchId = 100L;
        int batchControlYear = Year.now(sharedClock).getValue() - 1;
        String submissionBatchObjectKey =
                String.format("pre-submission-batching/%s/%s/%s/", APPLICATION_ID, batchControlYear, batchId);
        SubmissionBatch submissionBatch = new SubmissionBatch(batchId, submissionBatchObjectKey);

        SubmissionBatch b = new SubmissionBatch(batchId, submissionBatchObjectKey);

        UserSubmission userASubmission =
                new UserSubmission("ABC", "taxReturn-ABC", "ABC123", "/manifest", "/submission", "/userContext");
        SubmissionData userASubmissionData = mockSubmissionData("ABC");
        documentStorageService.write("/manifest", "something good");
        documentStorageService.write("/submission", "something even better");
        documentStorageService.write("/userContext", "something else");
        UserSubmission userBSubmission =
                new UserSubmission("DEF", "taxReturn-DEF", "XYZ789", "/manifest2", "/submission2", "/userContext2");
        SubmissionData userBSubmissionData = mockSubmissionData("DEF");
        documentStorageService.write("/manifest2", "something obvious");
        documentStorageService.write("/submission2", "something submtted");
        documentStorageService.write("/userContext2", "some user");

        documentStorageBatchRepository.addSubmission(b, userASubmission);
        documentStorageBatchRepository.addSubmission(b, userBSubmission);

        // 2. Create a SubmitBundleAction for the batch in step 1, enqueue it to the action queue
        SubmissionContainer submissionContainer =
                null; // SubmissionContainer is a MeF SDK type. The type is used for successful submissions so we don't
        // need it when testing error cases
        BundleArchivesActionResult bundleArchivesActionResult = new BundleArchivesActionResult(
                submissionBatch,
                new BundledArchives(
                        List.of(userASubmissionData.UserContext, userBSubmissionData.UserContext),
                        submissionContainer));

        SubmitBundleAction submitBundleAction = new SubmitBundleAction(bundleArchivesActionResult);

        // 3. Grab the action from the queue, and call actionHandler.handle()
        actions.getInProgressActions().add(submitBundleAction);
        actionHandler.handleAction(actions.getInProgressActions().take());

        // 4. Expect that a SubmissionFailureAction was added to the queue b/c SubmitBundle Failed
        assertEquals(1, actions.getInProgressActions().size());
        assertEquals(
                ActionType.SUBMISSION_FAILURE,
                actions.getInProgressActions().peek().getType());
        actionHandler.handleAction(actions.getInProgressActions().take());

        // 5. Call poll(), which should add 2 new ArchiveAction events to the queue for each individual submission in
        // the batch
        subject.poll();

        assertEquals(2, actions.getNewActions().size());
        // 6. Validate that files exist in the DocumentStore to process. There were 2 submissions in the batch, so we
        // should now 2 batches.
        List<DocumentStoreResource> submisson0Files = documentStorageService.getObjectKeys(
                String.format("pre-submission-batching/errors/application-id/%s/100/0/ABC123/", batchControlYear));
        List<DocumentStoreResource> submission1Files = documentStorageService.getObjectKeys(
                String.format("pre-submission-batching/errors/application-id/%s/100/1/XYZ789/", batchControlYear));
        /* Also validate each submission has 4 files associated with it. They are submission.xml, manifest.xml, userContext.json, factgraph.json */
        assertEquals(3, submisson0Files.size());
        assertEquals(3, submission1Files.size());
    }

    // When an error batch occurs, each submission in the error batch is processed without a FileNotFoundException
    // The other test here would be to create an error batch poller that loops through more than 1 submission and
    // verifies that each action for the first submission is processed before the 2 submission / batch
    // CreateArchiveAction is
    // processed
    @Test
    @SneakyThrows
    public void itRunsActionsForEachIndividualBatchSequentially() {
        // Arrange: Create a batch, and add submission data for two submissions to it.

        // 1. Create a batch with two submissions and add them to document storage
        long batchId = 100L;
        int batchControlYear = Year.now(sharedClock).getValue() - 1;
        String submissionBatchObjectKey =
                String.format("pre-submission-batching/%s/%s/%s/", APPLICATION_ID, batchControlYear, batchId);
        SubmissionBatch submissionBatch = new SubmissionBatch(batchId, submissionBatchObjectKey);

        SubmissionBatch b = new SubmissionBatch(batchId, submissionBatchObjectKey);

        UserSubmission userASubmission =
                new UserSubmission("ABC", "taxReturn-ABC", "ABC123", "/manifest", "/submission", "/userContext");
        SubmissionData userASubmissionData = mockSubmissionData("ABC");
        documentStorageService.write("/manifest", "something good");
        documentStorageService.write("/submission", "something even better");
        documentStorageService.write("/userContext", "something else");
        UserSubmission userBSubmission =
                new UserSubmission("DEF", "taxReturn-DEF", "XYZ789", "/manifest2", "/submission2", "/userContext2");
        SubmissionData userBSubmissionData = mockSubmissionData("DEF");
        documentStorageService.write("/manifest2", "something obvious");
        documentStorageService.write("/submission2", "something submtted");
        documentStorageService.write("/userContext2", "some user");

        documentStorageBatchRepository.addSubmission(b, userASubmission);
        documentStorageBatchRepository.addSubmission(b, userBSubmission);

        // 2. Create a SubmitBundleAction for the batch in step 1, enqueue it to the action queue
        SubmissionContainer submissionContainer =
                null; // SubmissionContainer is a MeF SDK type. The type is used for successful submissions so we don't
        // need it when testing error cases
        BundleArchivesActionResult bundleArchivesActionResult = new BundleArchivesActionResult(
                submissionBatch,
                new BundledArchives(
                        List.of(userASubmissionData.UserContext, userBSubmissionData.UserContext),
                        submissionContainer));

        SubmitBundleAction submitBundleAction = new SubmitBundleAction(bundleArchivesActionResult);
        CreateArchiveAction createArchiveAction = new CreateArchiveAction(submissionBatch);
        // 3. Add multiple new actions to the queue
        actions.getNewActions().add(createArchiveAction);
        actions.getNewActions().add(createArchiveAction);
        actions.getInProgressActions().add(submitBundleAction);
        // when runner.step() is called, the actionHandler will process the SubmitBundleAction and NOT the
        // CreateArchiveAction
        runner.step();

        // 4. Expect that a SubmissionFailureAction was added to the queue b/c SubmitBundle Failed
        assertEquals(1, actions.getInProgressActions().size());
        assertEquals(
                ActionType.SUBMISSION_FAILURE,
                actions.getInProgressActions().peek().getType());
        runner.step();
        assertEquals(2, actions.getNewActions().size());
        // Call the cleanup action
        runner.step();

        // 5. Call poll(), which should add 2 new ArchiveAction events to the queue for each individual submission in
        // the batch
        subject.poll();
        assertEquals(4, actions.getNewActions().size());
        assertEquals(0, actions.getInProgressActions().size());

        // Next step pulls the next new action from the queue and processes it
        // Need to mock the CreateArchiveAction to continue stepping through the actions here
        //        runner.step();
        //        assertEquals(3, actions.getNewActions().size());
        //        assertEquals(1, actions.getInProgressActions().size());
        //        assertEquals("BundleArchivesAction",
        // actions.getInProgressActions().peek().getClass().getSimpleName());
    }

    private Config createConfig() {
        boolean runnerDisabledForTesting = false;
        DirectoriesConfig directoriesConfig = new DirectoriesConfig(
                "src/test/resources/test",
                "src/test/resources/test",
                "src/test/resources/test",
                "src/test/resources/test",
                "src/test/resources/test",
                "src/test/resources/test");
        return new Config(
                "Test",
                null,
                null,
                directoriesConfig,
                null,
                null,
                "12345",
                "12345",
                "12345",
                "",
                runnerDisabledForTesting,
                true,
                true,
                "12345",
                "",
                "",
                "dfsys-mef-submit-deployment-0-us-gov-east-1");
    }

    private SubmissionData mockSubmissionData(String submissionId) {
        String userId = "UserId";
        String taxReturnId = "taxReturnId";
        String userTin = "userTin";
        TinType userTinType = TinType.INDIVIDUAL;
        UserContextData userContextData =
                new UserContextData(submissionId, userId, taxReturnId, userTin, userTinType, "0.0.0.0", "2024-01-01");

        SubmissionManifest submissionManifest = mock(SubmissionManifest.class);

        SubmissionXML submissionXML = mock(SubmissionXML.class);
        BinaryAttachment[] binaryAttachments = new BinaryAttachment[] {};
        return new SubmissionData(userContextData, submissionManifest, submissionXML, binaryAttachments);
    }
}
