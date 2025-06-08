---
# Configuration for the Jekyll template "Just the Docs"
parent: Decisions
nav_order: 100
title: "Accessibility targets"

# These are optional elements. Feel free to remove any of them.
status: "Accepted"
informed: "All project technical staff"
---
<!-- we need to disable MD025, because we use the different heading "ADR Template" in the homepage (see above) than it is foreseen in the template -->
<!-- markdownlint-disable-next-line MD025 -->
# Accessibility targets

## Context and Problem Statement

In supporting a critical task for all U.S. residents, Direct File should be accessible. This decision record sets a clear target for this phase of development to meet those accessibility needs, and we expect to exceed that target when feasible.

The U.S. describes its accessibility requirements in [Section 508](https://www.section508.gov/) of the Rehabilitation Act. [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) provides the same for the internet at large with three levels of compliance (A, AA, AAA), and it has increased in minor versions (2.0, 2.1, 2.2) over the last 15 years. 508 and WCAG have a [very large overlap](https://www.access-board.gov/ict/#E207.2), and all non-overlapping features unique to 508 are either irrelevant to this project (e.g. manual operation and hardware) or out of this repo's scope (e.g. support channels). See the note in "More Information" below for further information.

Given these equivalencies, all considered options are oriented toward WCAG and achieve 508 compliance.

## Considered Options

* WCAG 2.0 A and AA (base 508)
* WCAG 2.1 A and AA (508 superset)
* WCAG 2.1 AA (enhanced superset)
* WCAG 2.2 AA (forward-thinking)

## Decision Outcome

Chosen option: "WCAG 2.2 AA (forward-thinking)", because it ensures we meet our baseline and exceed our goal

### Consequences

* Good, because it establishes and exceeds 508 compliance
* Good, because it is easy to remember the level expected of all elements (i.e. "what needs level A vs AA?")
* Good, because it challenges us to maximize WCAG at level AAA
* Good, because it sets Direct File up with the latest a11y guidance for years to come
* Good, because it doesn't require any more work than WCAG 2.1 AA with our current design
* Neutral, because it may require slightly more work than the bare minimum in the future
* Neutral, some automated a11y tools don't yet support 2.2 (as of Oct 2023)

### Confirmation

This decision to exceed 508 requirements is confirmed by the IRS' 508 Program Office (IRAP) and by our Contracting Officer's Representative, Robin Coplen. IRAP will only ensure that the baseline is met (2.0 A and AA). Project technical staff will continuously confirm adherence to this decision's specific version and level using accesibility evaluation tools and manual evaluations when/where appropriate.

## Pros and Cons of the Options

### WCAG 2.0 A and AA (base 508)

* Good, because it establishes 508 compliance
* Good, because it is the easiest level to achieve
* Bad, because omits updates and new tech since its publication 15 years ago
* Bad, because it does not exceed 508 compliance, as called for in our mission

### WCAG 2.1 A and AA (508 superset)

* Good, because it establishes 508 compliance
* Good, because it is the easiest level to achieve for the latest published guidance
* Bad, because it does not exceed 508 compliance, as called for in our mission, for the latest technologies like mobile devices

### WCAG 2.1 AA (enhanced superset)

* Good, because it establishes and exceeds 508 compliance
* Good, because it is easy to remember the level expected of all elements (i.e. "what needs level A vs AA?")
* Good, because it challenges us to maximize WCAG at level AAA
* Neutral, because it may require slightly more work than the bare minimum
* Neutral, because it is an outdated version (see "more information" below)

### WCAG 2.2 AA (forward-thinking)

* Good, because it establishes and exceeds 508 compliance
* Good, because it is easy to remember the level expected of all elements (i.e. "what needs level A vs AA?")
* Good, because it challenges us to maximize WCAG at level AAA
* Good, because it sets Direct File up with the latest a11y guidance for years to come
* Good, because it doesn't require any more work than WCAG 2.1 AA with our current design
* Neutral, because it may require slightly more work than the bare minimum in the future
* Neutral, some automated a11y tools don't yet support 2.2 (as of Oct 2023)

## More Information

* For a complete description of Section 508, see https://www.access-board.gov/ict/
  * WCAG 2.1 is a superset of WCAG 2.0, which will be the official 508 version until Access Board approves an update, which can take years.
* Most automated testing tools use version 2.1, so 2.0 compliance may appear as failing on tools and 2.2 may not be available. In 2.2's case, it is largely backwards-compatible to 2.1 AA assuming all other criteria are met; therefore, if tools don't reflect 2.2 we can treat their 2.1 AA conformance as equivalent.
* Most testing tools are focused on level (A, AA, AAA) of compliance, so setting level AA as our target would be more memorable, programmable, and communicable.
* How we achieve these targets, including tooling and processes, are described in a separate decision record.
* WCAG 3 is still in a working draft phase, but it provides some guidance that may be truly better but technically non-compliant with 2.2 due to backward incompatibility. For example, WCAG 3.0 uses a new [color contrast algorithm (APCA)](https://github.com/Myndex/SAPC-APCA/blob/master/documentation/WhyAPCA.md#why-the-new-contrast-method-apca/) that better matches reality. In our effort to exceed targets, we may want to use [this calculator](http://www.myndex.com/APCA/) to test contrast among other things to allow us to both exceed our targets and be forward-thinking.
* Things 508 covers that WCAG does not explicitly (TLDR: there are no issues):
  * **Functional Performance Criteria**: at least one method must be provided allowing individuals with disabilities to interact with the product. Most of these are [explicitly covered by WCAG](https://www.section508.gov/content/mapping-wcag-to-fpc/), but two are not:
    * Without Speech - where speech is used for input, control or operation, ICT will provide at least one mode of operation that does not require user speech. We will not have any speech-based features built into this project, so this is not an issue.
    * With Limited Reach and Strength - where a manual mode of operation is provided, ICT will provide at least one mode of operation that is operable with limited reach and limited strength. We will not have any manual operation methods, so this is not an issue.
  * **Hardware and software**: 508 applies to websites like this, as well as hardware and operating systems. We are not building these, so this is not an issue.
  * **Alternative Means of Communication**: 508 ensures that people with disabilities can effectively communicate and interact with support personnel. Examples of alternative means of communication include relay services for individuals with hearing impairments or providing accessible contact options for individuals with disabilities.
