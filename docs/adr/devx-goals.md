# Top line DevX goals
*Note: these are topline goals -- they may be contradictory and specific situations may involve trading off against these separate goals*

1. Creating a working, running set up of all services should be one command, `docker compose build`. 
1. Running each service locally should be one command, `./mvnw spring-boot:run -Dspring-boot.run.profiles=development`
1. Running tests on each service should be one command, `./mvnw test`
1. Basic IDE settings for IntelliJ and VS Code are checked into the repository, and opening a service or the full `direct-file` repository in these IDEs should "just work". Tests should run in the IDE, local debuggers should work, and there should be no red squigglies or unresolved problems in the IDE.
1. Formatters and linters (e.g. spotless and spotbugs) should standardize formatting, prevent unused variables, enforce styling, and otherwise keep the codebase clean and consistent. CI should check this formatting and linting. 
1. Code standards are kept via CI tests and robots, not human code reviews. 
1. We should have a build time of 5 minutes or less for our CI checks.
1. Environment variables and scripts that require setup outside of our build scripts should be minimal. When environment variables or scripts are required, and are not set, a service should fail immediately and loudly with a helpful error message. 
1. Making a simple change should be simple and take a short amount of time (e.g. updating a fact graph -> MeF mapping should be 1 line of change)
1. Similarly, writing a simple test should be simple, and modifying our tests (unit or snapshot) should be clear and easy. 
1. Error messages that indicate a problem in environment setup should be clear and simple. 
1. Error and warn logs should always point to a real and solvable problem. 
1. We should not have manual code changes that are derivative of other code (e.g. updating `aliases.ts` for aliased facts).
1. Any script that is a part of a common dev workflow should be checked + run in CI. 


## First 3 goals
We're doing great on the first 3 DevX goals! 

## Basic IDE settings
1. We should check in recommended VS Code settings + plugins for Java Development. 
1. We should (?) have recommended settings for IntelliJ checked in. 
1. We should fix the bad imports on jaxb sources for the IRS MeF SDK.
1. We should finish setting up spotbugs across projects, and resolving our existing spotbugs errors. 
1. We should standardize our linting + formatting tools, and make them run in CI to prevent unresolved problems. 

## Environment variables
1. We should have a louder error + immediate failure for not having `LOCAL_WRAPPING_KEY` set when someone runs a 
2. Submit and status apps should fail to start without the appropriate environment variables set, along with a message about what variables are required.

## Simple changes should be simple
(Alex lacks the most content here, and would love people to add more)
1. We should stop checking in generated code for the frontend fact dictionary, and move that to a build step when someone starts, builds, or tests the frontend, since backend devs should not need to run `npm run build` when they modify facts. 
1. We should stop checking in generated MeF code for the backend Mef packing transform, and move that to a build step that runs prior to the backend's `./mvnw compile` command. That command should run consistently. 
1. We should remove all checked in intermediate formats and only have checked in writable fact graphs, and checked in XML snapshots. 

## Simple tests should be simple
We're doing a lot better here than we used to! Snapshot tests now run in CI and regenerate automagically, instead of being an ETE test. 

## Error messages + logging
1. We should look through our existing logs and check for unnecessary warn/error messages that are noisy, and remove those noisy logs (e.g. the address facts that currently spam every packing). 

## Removing duplicative manual code changes
1. We should fix `aliases.ts` to not require changes any time someone creates a `Filter` or `IndexOf` fact. 
