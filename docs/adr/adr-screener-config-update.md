[//]: # ([short title of solved problem and solution])

    Status: [proposed | rejected | accepted | deprecated | … | superseded by ADR-0005]
    Deciders: [list everyone involved in the decision]
    Date: [YYYY-MM-DD when the decision was last updated]

## Context and Problem Statement

[//]: # ([Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question.])
A decision was made in [adr-screener-config](./adr-screener-config.md) to use Astro SSG (static site generator) for the screener application. It was initially used for an MVP, and later replaced with React/Vite. This adr is to document that change and supersede the previous adr.

## Decision Drivers

    - the realization that the application needed to support more dynamic features such as react-uswds and i18n features.

## Considered Options

    React/Vite

## Decision Outcome

Chosen option: "React/Vite", because it was consistent with the client app and the approach to i18n could be consistent across the screener and client apps.

### Positive Consequences

    - More dynamic content is an option
    - We can easily utilize react-uswds library.
    - The i18n system is aligned in both the screener and the client app.
    - Engineers don't need to learn multiple systems and can seamlessly develop between the two apps. Onboarding for new engineers is simplified.

### Negative Consequences

    - It's more complex than a more static configuration would be
