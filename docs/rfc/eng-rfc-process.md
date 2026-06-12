Created At: May 5, 2024
Updated At: May 14, 2024

RFC: Evolving How We Align on Technical Decisions

# Problem Statement

Direct File has matured as an application over the past year (read: we went to production) and grew its headcount to a 70+ member product team. However, we have not invested a lot of resources into adapting our processes around technical decision making to our burgeoning scale. This has manifested itself in last-mile delivery delays for various initiatives, primarily due to the fact that the right stakeholders were not in the room at the appropriate moments or they did not know that a decision was being made until after the fact.

Similarly, as Direct File grows in product scope, our relationship with the larger IRS IT organization will both change and become increasingly important. Integrating our ways of working during the pilot to the processes of the IRS enterprise more broadly will require a different approach than what served us during the pilot.

# BLUF: Proposed Process Changes

1. Distinguish RFCs from ADRs and clarify when to leverage each one
2. Establish a dedicated meeting time, with defined decision-makers, for reviewing RFCs that did not achieve alignment during async review
3. Include IRS IT SMEs within the RFC process and identify the criteria under which they should be engaged for certain changes

# Definitions

Request For Comments (RFC): In the engineering context, a formal document that recommends a technical specification for a set of product requirements. This can include anything from a change solely at the application level to a system(s)-wide, architecture that engages with multiple external services. Typically contains a set of working definitions, articulation of key product requirements, proposed implementation and analysis of alternatives. If the RFC is approved, it becomes the touchpoint for technical implementation and should be revised according to if new requirements appear. Some RFC are designated indefinitely with Experimental or Draft status.

Architecture Decision Record (ADR): A “lightweight” document that captures the rationale of a Architectural Decision (AD), i.e. a justified design choice that addresses a functional or non-functional requirement that is architecturally significant. ADRs captures a single AD and its rationale; the collection of ADRs created and maintained in a project constitute its decision log. ADRs typically contains a title, status, context, decision, and consequences.

# Proposal

## Goal

The goal of this proposal is to find the right balance between:

1) Functioning in an product-centric, agile manner;
2) Not constraining ourselves with unnecessary overhead; and
3) Clearly understanding the when, who and how of engaging with our IRS IT counterparts at the appropriate times.

The remainder of this proposal deals with some ways we can balance these needs and achieve these goals.

## Deepen our understand and engagement with the IRS IT organization and get our IRS IT SMEs involved as early as possible

We should engage with, at a minimum, our embedded Cyber SME and Technical Advisor as initial reviewers for any major system change, rather than as stakeholders that must be looped in only when the "paperwork" stage is reached, i.e. post-decision. Our IRS SMEs are our colleagues and champions within the enterprise - the earlier they are aware of changes that might require their support, the better the process will be for getting the features to production.

IRS IT SMEs should be involved when a system-wide change is being proposed, in particular one that might involve an update to any part of our ATO and especially control implementation statements in our System Security Plan (SSP). These changes typically require updating the `application.boundary` or `application.context` compliance documentation at some stages.

### When should I loop in IRS IT SMEs?

Examples of "system-wide changes" includes, but are not limited to:

- Provisioning new cloud infrastructure, both compute and storage
- Requesting changes to how our network boundaries are configured
- Adding new API endpoints or modifying where a URI can be located (i.e. changing the structure of the endpoint)
- New vulnerability scan findings that cannot be remediated timely
- Changing any part of our authorization or authentication flow
- Storing or accessing SBU/PII/FTI in an environment that isn't the application database or cache (in particular SaaS tools)
- Deviation from IRS IRMs
- Data or container security
- Integrating with other parts of the IRS (enterprise services, on-prem, cloud, etc.)
- Establishing connections external to the IRS
- Requesting new tools (whether or not they are ESP or COE approved)
- Major version upgrades of software framework components
- Standing up new deployed services

## Leverage RFCs as the primary mechanism to propose technical specifications

We currently conflate the concept of an ADR with an RFC. ADRs are static artifacts that are post-decisional; an engineer should be able to read the entire decision log of ADRs and roughly understand why the system is configured as it is. RFCs, on the other hand, are live documents meant for discussion and iteration. They are better suited for soliciting input and collecting feedback on a proposed approach, which is the right first step for proposing a technical specification. The outcome of an RFC might be an ADR, if the scale of proposed change merits it.

In practice, this means that once engineers are given a sufficiently large or complex set of requirements, they articulate their proposed approach in an RFC, rather than a combination of Gitlab tickets, Slack threads, and markdown files committed to the codebase with the word "ADR" in the title. This forces the engineer to spend more time substantiating their reasoning for a certain implementation and weighing various alternatives, as well as investigating the various upstream and downstream dependencies of the proposal. It also requires the engineer to consolidate their thoughts into a single SOT document, reducing the cognitive overhead of all participants of tracking the outcome across multiple surfaces (Github, Gitlab, Slack, Teams, etc.).

Writing an RFC **does not** negate the need to prototype various solutions; rather, prototyping should be considered part of the RFC process as a way to demonstrate the feasibility of a given approach and that alternatives were considered.

Importantly, designing larger features and broader architecture design has historically been limited to a small number of developers relative to the size of the engineering organization, limiting the ability for other engineers to contribute and grow as system designers. This is mostly due to reasons of velocity and speed necessary to get the pilot out the door. RFCs provide a mechanism through which to enable other engineers to own their features end-to-end, instead of relying on another engineer to propose the implementation which they then action.

## Add a synchronous, cross-org forum for discussing RFCs that are not resolved asynchronously

In addition to moving to a world where RFCs are the formal document that facilitate discussion, we should also move away from a model where major engineering decisions are both reviewed and approved by a single functional team in a predominately asynchronous, i.e. in Github PRs. Instead, we should move towards a model where a broader audience can  weigh in on proposed changes and discuss outstanding questions in a synchronous manner.

Making RFC review into a blocking mechanism is not the goal. Synchronous time should be leveraged **only** when there are outstanding questions on a proposal that require live, cross-team discussion. While async review and approval is always the first and best option, practically speaking at a certain level of system change, live discussion is inevitable if not necessary. We should embrace that reality, not fight it and rely on back-channels and 100-comment Slack thread to facilitate alignment on major changes.

Tactically, this would involve adding a standing RFC-review meeting that is 1) team-agnostic and open to the entire Product organization; and 2) always includes our Cyber SME and Technical Advisor as participants to make sure that all dependencies are considered. **An agenda should be circulated to participants 36 hours in advance and the meeting can be canceled if there is no agenda.**

One key benefit here is that a cross-organization, discussion-based approach to RFCs reduces knowledge silos across the product organization and allows engineers to better  1) understand what is happening across different teams; and thus 2) flag cross-cutting concerns that might not have been addressed during the primary review phase (e.g. changes to authn/authz affects many different teams, but not every team might be involved as the primary reviewers).

### Why a standing meeting instead of as needed/ad-hoc?

While the flexibility of ad-hoc better mirrors our historical and current practices around engineering meetings, there are a few reasons why a standing meeting with the sole purpose of reviewing RFCs is beneficial, at least in the first instance:

1. The right people are always in the room: the blended team model create a world where no single individual has access to everyone's calendar. By maintaining a standing meeting, everyone must put re-occurring blocks on their respective calendars, greatly increasing the chance that if they are a stakeholder, they will be able to attend.
   1. In this vein, we want to ensure that our key IRS IT counterparts - those with a known stake in facilitating the delivery of the technical output - have their concerns are addressed before proceeding to implementation. This reduces our overall delivery lead time by removing "unknown unknowns" and proactively identifying (and accounting for) process-based roadblocks much earlier in the delivery process.
2. Resolving opposing views: major engineering changes often have several viable paths, and it is rare to have all outstanding questions answered asynchronously. A standing meeting releases both the author and reviewer from "finding a time to hash it out live" in favor of using a dedicated mechanism like RFC review (with an agenda and time limit on topics) to facilitate to discussion. This reduces unnecessary friction within and across teams, and enables other members of the organization to manage the discussion.
3. Context sharing and maintaining visibility for other teams and leadership: As Direct File grows, it is unrealistic that the people who might have reviewed PRs during the pilot will have the time to do so in Year 2, 3, etc. This doesn't mean, however, that they want to be divorced from the technical discussions that are happening. A standing meeting provides a dedicated space for those members/leadership to keep a finger on the pulse of what is happening without reviewing a dozen RFCs a week.
4. It is easier to start with a standing meeting and move to ad-hoc later than vice versa. Especially as we build the organizational muscles around a process like RFC review, it is helpful to have the meeting in place instead of requiring individuals to advocate for ad-hoc meetings out of the gate. During filing season, for instance, I expect us to leverage ad-hoc meetings significantly more. Conversely, during May-September when a lot of planning and technical designs are chosen, we would benefit from a standing meeting to make sure we aren't crossing-wires and are moving in lockstep.
5.

# Appendix I: Step-by-Step examples of how this all works in practice

If implemented, the expected development lifecycle would look roughly as follows:

**note: Each team/group/pod maintains autonomy in terms of how they want to define and implement the various steps, as long as 1) async and sync RFC review is incorporated into their development; and 2) IRS IT SMEs are engaged at the appropriate moments. The below will not map perfectly onto any given team's cadence, and instead aims to approximate the most-process heavy approach from which team's can choose what they would like to incorporate.**

1. Product requirements for a feature set are specified in a ticket (by someone)
2. The Directly Responsible Engineer (DRE) provides an initial, rough estimate of the scope and sizing of the work, as well as the documentation required to drive alignment on an organizationally acceptable approach:
   1. If a system-wide change (see below for criteria) is involved, an RFC and ADR will be required before moving to any implementation. **IRS IT SMEs should be looped in early as key stakeholders and reviewers.**
   2. If the feature set is not a system-wide change, the DRE has discretion about if an RFC would be a helpful tool to facilitate design and/or gain consensus within a team or across teams. Some feature sets are complex enough to benefit from an RFC; others are not. Once the RFC is drafted, reviewed and approved, the DRE can begin implementation.
   3. If an RFC is not needed, the DRE can immediately begin implementation and put up a PR with a description of the work and link back to the ticket.
3. If an RFC is needed, the DRE drafts a written proposal as a means to solicits feedback on the proposed technical approach. The document should live in the `docs/rfc` directory and be committed to the codebase in a PR in a text format like Markdown with associated artifacts (diagrams, etc.) included as needed.
   1. All initial discussion can happen asynchronously and ad-hoc.
   2. If a system-wide change is being proposed, DevOps and our IRS IT colleagues (in particular Cyber SME and Technical Advisor) should be looped in at this stage as reviewers.
   3. If a system-wide change is not being proposed, the DRE and reviewers should use their discretion as to if IRS IT should be engaged or not during the RFC stage. **If they are not engaged, the assumption is that they will not need to be engaged during or after implementation.**
4. If all questions (including those from IRS IT colleagues) are sufficiently addressed in the written RFC, the RFC can be approved and the DRE can move to implementation.
5. If there are outstanding questions in the RFC that cannot be resolved asynchronously, the RFC is slotted for discussion during the standing "RFC Review" meeting and circulated for discussion to all RFC Review participants.
   1. During the meeting, the DRE presents a summary of the proposed changes and the group discusses the main outstanding questions and aligns on a path forward.
   2. The DRE updates the RFC as needed coming out of this meeting.
   3. n.b. **this is the only synchronous portion of this process, everything else is asynchronous**
6. In the event that an ADR is needed, after the RFC stage is complete an ADR is drafted and committed to the codebase in the `docs/adr` repository. This should all occur asynchronously and should be merged in short order with minimal review cycles.
   1. No alignment is needed on the ADR as it simply codifies the outcome of the RFC and RFC review.
7. Once the RFC and/or ADR stages are complete, the DRE can begin implementation. At the same time, they also coordinate with IRS IT and DevOps to understand if they need any additional documentation aside from the RFC and ADR is necessary to initiate or facilitate IRS IT or IEP processes.

# Appendix II: Deciding between RFC, ADR and normal PRs

This section provides a basic decision tree for deciding between the following processes (in order of number of parties that need to coordinate to make a change, from least to most):

- Ticket with a PR
- ADR
- RFC
- A combination of the above

In general, default to the process requiring the least coordination available if you can't decide.

1. Are any of the criteria of the 'When should I loop in IRS IT SMEs?' section above met? -> RFC + ADR + loop in IRS IT SMEs as early as possible. See the long list of examples in the aforementioned section.
2. Is the feature set cross-cutting and requires multiple teams/pods to weigh in? -> RFC (ADR optional) + should confirm with IRS IT SMEs if there are upstream dependencies/compliance considerations that require documentation updates. Examples include
   1. User-permissions
   2. SADI
   3. Major changes to MeF Integration
   4. Major changes to the submission flow
   5. Microservice messaging (queues, pub/sub)
3. Is the feature set within the domain of a single pod but cross-cutting between teams? -> RFC helpful but not required (ADR optional as well)
   1. Addition of or modification to core functionality of a given microservice
4. Is the feature set within the domain of a single pod and within the domain a single team? -> RFC optional, depends on if the DRE feels it would be helpful to have a document separate from PR description or adding detail to ticket
   1. Changes to MeF/PDF/Fact Graph conversion
   2. Major additions or modifications to the UX flow
   3. Implementing new tax logic within the flow/fact graph
   4. Implementing or modifying retry logic for certain backend processes (e.g. sending email)
   5. Requesting infrastructure configuration changes for previously-provisioned resources, such as changing the redrive policy on SQS for certain queues
5. Does the feature set have pre-existing, well defined product and technical requirements? -> PR/ticket is sufficient, no need for RFC or ADR
   1. Modifying pre-existing tax logic within the flow/fact graph
   2. Adding new repositories,interfaces, classes, services, etc. that clean up parts of the codebase
   3. General refactoring
   4. Spring-ifying the backend services
   5. Updating dependencies
   6. Remediating security findings
