## Overview

There are two main scenarios that, as it currently stands, the combination of our incident response (IR) practices and customer support (CS) motion do not support:

        a) A taxpayer hits submit but an XMl validation failure occurs and they cannot submit at all. CS is unavailable (for whatever reason) and they give up attempting to submit with Direct File.
        b) A taxpayer submits successfully, but an internal error occurs in the Submit application that blocks our ability to send their return to MeF. CS is not involved because, presumbly, the taxpayer never reached out to CS in the first case as they didn't run into any errors when hitting submit.

Our inability to reach out to taxpayers proactively is primarily due to the fact that CS can only reach out to taxpayer who reach out to them first via eGAIN.

In the above scenarios, neither taxpayer knows 1) if the issue they ran into has/will be fixed; and 2) if so, that they should resubmit their return. As a result, they are effectively left in the dark and/or knocked out of the filing with Direct File, thereby forcing them to submit elsewhere.

While our scale to-date (as of 2/26) has shielded us from the pain of these scenarios, or alleviated them altogether, we don't have a clear way to address them at this moment. Further, there is a very high likelihood that these scenarios will occur over the coming weeks and will become especially painful if/when the submission volume scales dramatically faster than our CS capabilities.

## Proposals

While we cannot change our CS motion to support this, we can enable a better product experience through how we notify taxpayers via email when an error occurs in our system.

### Notify taxpayers when we cannot submit due to internal error
We should notify taxpayers via email that there was an error submitting their return at the time of submission, i.e. XML validation failure or XML validation success but Submit app failure. The technical infrastructure to send emails on XML validation failure is already in place, we just need to create the HTML template for the email and actually send an email when XML validation failure occurs. Similarly, the requirements to send an email due to a post-submission error when trying to submit to MeF can be found here, and just need to be actioned.

### Notify taxpayers when Direct File has deployed a fix that should allow them to resubmit their return
We should also notify taxpayers via email that they are able to submit their return when we have deployed a fix into production that addresses the error that blocked them from submitting in the first place.

### Proposed Technical Changes (Rough)

1. Add two new HTML Templates to capture the two notification scenarios above, e.g. SubmissionErrorTemplate and ErrorResolvedTemplate. The templates should be added to the backend app, such that the ConfirmationService can process it, as well as the actual HTML template in the email app that is sent via email and rendered to the taxpayer
2. When an XML validation failure occurs during submission  create a `SubmissionEvent` with an `eventType` of `error_xml` and enqueue a message from the backend to the email app to notify the user (naming of the eventType is TBD, might make sense to add a new `message` column and keep the eventType as `error`)
3. Update the SQS message sent from submit -> backend (on the submission confirmation queue) to allow for an `error` status. If the ConfirmationService and SendService are properly configured as per #1 above, everything should flow seamlessly. Similar to #2, create a `SubmissionEvent` with an `eventType` of `error_mef` for each submission that failed to submit to MeF (naming of the eventType is TBD, might make sense to add a new `message` column and keep the eventType as `error`)
4. Add a function to the backend that, when called, ingests a CSV of `taxReturnIds`, transforms the list into a SubmissionStatusMessage and calls ConfirmationService.handleStatusChangeEvent
5. Once a deploy goes out that fixes the underlying issue, create a CSV with `taxReturnIds` of the affected taxpayers (both those who reached out to CS and those who did not) using Splunk queries
6. Send this CSV to IEP and ask 1) their System Admin to run the command specified in #4; or 2)have them upload it to S3 and do something similar to the email allow list such that the function specified in #4 polls S3 and sends emails based off this polling. This second approach would require more state management but would possibly cut out the need for IEP to run commands and maybe obviate the need for a p2 to make this happen.
7. Add monitoring in place to observe the emails being sent out accordingly
8. [Alternative] We move the 'submitted' email to send only after we receive submission confirmation, not after we pass XML validation
