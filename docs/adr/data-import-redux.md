# Data Import Redux

Date: 5 Nov 2024

## Context

To facilitate the correctness of the frontend data import system, we will use redux to coalesce data from APIs.

Data Import has many lifetimes that are independent of traditional timeframes from the app. Data fetches get kicked off, data returns later, data gets validated as ready for import all independently of user action.

Front end screen logic is much simpler to write as a function of state rather than having to manage separate lifetimes in multiple places such as context, component state etc.

## Decision

Data Import will use the Redux Library to make it easier for us to manage changing state related to incoming data from the backend.

We will write logic in redux to transform data as it comes in so that the frontend knows when to use it.

# Alternatives Considered

## React Context and Fact Graph

- Lack of chained actions - because we expect data from different sections (about you, IP PIN, w2) to come in at different times, we need to be able to chain /retry fetches and coalesce them into one structure. Redux makes this much easier than alternatives considered.
- Limits blast radius - with data coming in and out while people are on other screens, redux provides much better APIs to avoid rerenders on API calls that are not relevant to the current screen.

# Other Libraries

I looked briefly at Recoil, MobX, Zustand and Jotai but they all seemed geared at simpler apps. Some of Data Import's initial features (e.g. knowing if more than a second has elapsed during a request) are much easier to implement in redux based on my prototyping. Secondly, Redux is so well used that nobody ever got fired for using redux :P

# Future Uses

Redux has a few key advantages over things we have in our codebase right now:

- Automatically manages the render cycle more efficiently (important as our react tree grows ever larger)
- Proven at scale with complex application state
- Well known in the industry with a good tooling eco system

That being said, there are no current goals to rewrite anything in Redux. Rewriting core components of our application would take a lot more prototyping and exploration than is being done as part of this process.
