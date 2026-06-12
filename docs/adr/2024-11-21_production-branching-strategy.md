# Github Branching Strategy for FS25 Production Development

    Status: Accepted
    Date: 2024-11-21
    Decision: Option 1 - Set `main` as "future features" branch for all TY25+ work and create a long-term `production` TY24 branch and merge from `production` into main

## Context and Problem Statement

[//]: # ([Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question.])

This ADR documents our short-term Github branching strategy for filing season 2025 (FS25), starting in January 2025.

We don't currently support multiple tax years simultaneously in Direct File and all active tax logic in the repo at any point in time is currently for a single tax year. In the pilot year, filing season 2024 (FS24), we only supported tax year 2023 (TY23) and in the second year starting in January 2025 (FS25), we plan to only support tax year 2024 (TY24). We also have an additional product goal of keeping Direct File open year-round, but only supporting one tax year at a time for now. Supporting multiple tax years concurrently in production is on the roadmap for TY26/FS27.

Our development goals in the second year of Direct File are to simultaneously support two modes of operating within our single Github repository:
1. Support the active tax logic in production for TY24, fix bugs and potentially add small tax scope items that should be deployed to taxpayers in production during FS25
1. Start development on future scope beyond this year - Factgraph and foundational improvements and future TY25 tax logic that should not be deployed to taxpayers in production until after FS25

## Decision Drivers

Some factors considered in the decision
- Ease of use for developers: how can we make it easy for developers to use the right branch by default? A majority of the team will focus on active production TY25 tax scope and a minority will be working on future scope
- Complexity for devops: understand the workload and changes required for devsecops with each strategy
- Error workflow: if a PR is merged to the wrong branch, how easy is the workflow for fixing the error?
- Minimize git history issues: consider alternatives to the cherry-picking approach we took last year in order to make production git history cleaner and more accurate. Avoid situations where cherry-picked commits do not include important prerequisite changes.

## Considered Options

### Option 1: Set `main` as "future features" branch for all TY25+ work and create a long-term `production` TY24 branch and merge from `production` into main


#### Branches
- `main`: The evergreen branch consisting of both future features and production TY24 code. This branch is *not* to be deployed to taxpayers in production during FS25
- `production`: The long-running branch consisting of only production TY24 code, to be deployed to taxpayers in production during FS25 on a weekly basis via release branches.
- Pre-commit hooks and branch protection rules will also need to be configured on this new branch enforcing code review, CI tests, scans and more

#### Releases and Deployment
- Cut releases from `production`
- Deploy from `production`
- Reserve the TEST environment for regular deployments from `main` for testing future features
- Continue to use the PRE-PROD environment for `production` branch testing
- Continue these two branches throughout the year
- When it is time to cutover to TY25 (December 2025 or January 2026), fork a new `production` branch from `main` and continue the same processes for the next tax year (or move to Option 3 or another long-term branching strategy)

#### Developer workflows

The first step is to identify whether the work is destined for the current `production` branch, or whether it is work that is only for future tax years.

##### For production TY24
1. Check out and pull `production` branch
    - `git checkout production`
    - `git pull`
1. Create/check out new branch for feature/fix work
    - `git checkout -b branch-for-ticket`
1. Create a PR for changes into `production` branch
1. Squash and merge PR into `production` branch
1. Create a second PR from the `production` branch into `main` and resolve conflicts if needed. We are unable to automate this step at this time, but would like to merge into `main` on every PR in order to make the conflict resolution easier.
   - Note: Regular merge (not "Squash and Merge") is recommended here

##### For future features
1. Check out `main` branch
1. Make PR against `main` branch
1. Merge into `main` branch

#### Error workflow
##### If a change intended for `production` is accidentally made on `main`
1. Revert PR from `main`
1. Make new PR against `production` and follow developer workflow for production TY24 above

##### If a change intended for `main` is accidentally made on `production`
1. Notify release manager in the event the change might be destined for deployment and coordinate as needed
1. Revert PR from `production`
1. Make new PR against `main` and follow developer workflow for production TY24 above

### Option 2: Set `main` as the production TY24 branch and create a long-term "future features" branch for all TY25+ work and merge it back into `main`

#### Branches
- `main`: The main production branch consisting of only production TY24 code, to be deployed to taxpayers in production during FS25 on a weekly basis via release branches
- `future`: The long-running branch consisting of only future features TY25+ code, *not* to be deployed to taxpayers in production during FS25

#### Releases and Deployment
- Cut releases from `main`
- Deploy from `main`
- Reserve a lower environment for regular deployments from `future` for testing future features
- Continue these two branches throughout the year
- When it is time to cutover to TY25 (December 2025 or January 2026), fork a new `main` branch from `future` and continue the same processes for the next tax year

#### Developer workflows

The first step is to identify whether the work is destined for the current `production` branch, or whether it is work that is only for future tax years.

##### For production TY24
1. Check out `main` branch
1. Make PR against `main` branch
1. Merge into `main` branch
1. Create a second PR from the `main` branch into `future` and resolve conflicts if needed. We are unable to automate this step at this time, but would like to merge into `main` on every PR in order to make the conflict resolution easier.
   - Note: Regular merge (not "Squash and Merge") is recommended here

##### For future features
1. Check out `future` branch
1. Make PR against `future` branch
1. Merge into `future` branch

#### Error workflow
##### If a change is accidentally merged into `future`
1. Revert PR from `future`
1. Make new PR against `main` and follow developer workflow for future features

##### If a future feature change is accidentally merged into `main`
1. Notify release manager in the event the change might be destined for deployment and coordinate as needed
1. Revert PR from `main`
1. Make new PR against `future` and follow developer workflow for future features

### Option 3: Continue with one `main` branch and use feature flags to control production functionality
Two technical prerequisites are required for this option that do not exist today:
1. Ability to have multiple tax years exist in the codebase simultaneously because the repository will not have a way of separating one tax year from another via branches. This functionality is currently planned for 2026, not 2025.
1. Robust feature flagging: Because there will only be one single `main` branch that is deployed to production, we need to have a feature flag system we are confident in to ensure that future features do not accidentally launch to taxpayers ahead of schedule when they are not fully complete.

#### Branches
- `main`: The evergreen branch consisting of both future features and production TY24 code. This branch is to be deployed to taxpayers in production during FS25 on a weekly basis via release branches

#### Releases and Deployment
- Cut releases from `main`
- Deploy from `main`
- When it is time to cutover to TY25 (December 2025 or January 2026), no actions are necessary because there is no reconciliation / update of branches needed, there is only one `main` branch

#### Developer workflows
##### For production TY24
1. Check out `main` branch
1. Make PR against `main` branch
1. Merge into `main` branch

##### For future features
1. Check out `main` branch
1. Make PR against `main` branch with a feature flag that controls whether taxpayers will have access to the feature in production (for future features, this should likely be set to OFF)
1. Merge into `main` branch

#### Error workflow
##### If a change is accidentally merged into `main`
1. Revert PR from `main`
1. Make new PR against `main` and follow developer workflow for production TY24 above

## Decision Outcome

Chosen option: Option 1: Set `main` as "future features" branch for all TY25+ work and create a long-term `production` TY24 branch and merge from `production` into main in order to minimize the risk of future featues merging into the `production` branch by mistake. This option will maintain stability in `production` for our taxpayers, but will result in slightly more friction in the TY24 developer workflow.

## Pros and Cons of the Options

### Option 1: Set `main` as "future features" branch for all TY25+ work and create a long-term `production` TY24 branch and merge from `production` into main
`+`
- Lower risk of future features slipping into production because `main` as "future features" branch is the default branch

`-`
- Changes to devops workflow for releases and deployment are required because we will now be deploying from `production`
- Higher risk of TY24 changes being made on `main` instead of `production` because `main` is still the default. Developers working on TY24 will need to consciously switch over to the `production` branch, but mistakes on the `main` branch will not lead to taxpayer impact since `main` is not being deployed to production
- Breaks the principle that `main` is always deployable

### Option 2: Set `main` as the production TY24 branch and create a long-term "future features" branch for all TY25+ work and merge it back into `main` at the end

`+`
- `main` continues to be the source of truth for production code and is deployable to production
- No change to devops workflow for releases and deployment, we continue to deploy from `main`

`-`
- Higher risk of future features accidentally slipping into `main` since it is still the default branch, which may lead to production issues with taxpayers
- End of season switchover is a little wonky as `future` becomes `main` and a new `future` is created

### Option 3: Continue with one `main` branch and use feature flags to control production functionality
`+`
- No change to developer workflow in either case of making production TY24 changes or future feature changes
- No change to devops workflow for releases and deployments

`-`
- Will require additional engineering lift to complete the technical prerequisites of supporting multiple tax years at once and building out the feature flag system, that is unclear we have time for before January 2025

## Background information
- Our team is currently using [Github flow](https://docs.github.com/en/get-started/using-github/github-flow)
- Some additional git workflows considered for inspiration were [Gitflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) and [Gitlab flow](https://about.gitlab.com/topics/version-control/what-is-gitlab-flow/), neither of which perfectly met our needs in a simple way
