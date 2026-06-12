## Key Concepts

## Identifiers
### Tax Return ID
The UUID identifier (e.g. 4638655a-5798-4174-a5a0-37cc3b3cd9a0)  that identifies the entire experience a taxpayer has with Direct File for one filing season independent of submissions. We generate this ID once at return creation time. MeF has no knowledge of this ID

Example: My first submission is rejected by MeF and my second is accepted. The tax return ID will be the same for both

### MeF Submission ID
The string identifier (e.g. 55555620230215000001) that identifies each submission within MeF. We generate this ID at each return's submission time.

Example: My first submission is rejected by MeF with submission ID 55555620230215000001 and my second submission is accepted with submission ID 54444420240215000004. The tax return ID will be the same for both submissions

### Receipt ID
The UUID identifier that identifies receipt of the submission by MeF.  MeF generates this ID for each submission we send it. If no receipt ID exists for a submission, then MeF didn't receive it.

Example: My first submission is rejected by MeF with receipt ID 2d59a07d-57ef-4392-8196-48ac29dce023 and my second submission is accepted with receipt ID 0ac15058-9352-49f8-9b84-5e3faed41676.

Example: MeF is accepting submissions but isn't processing them. My first submission is submitted to MeF and enqueued to the backlog of submissions to process, and MeF returns receipt ID 2d59a07d-57ef-4392-8196-48ac29dce023.  I do not receive an acknowledgement (see below) until MeF is back online which tells me if my return is accepted or rejected

### Acknowledgement
The term used for a processed submission in MeF that has a status associated with it (accepted or rejected). Associates to a submission Id and receipt Id.

Example: My first submission is submitted and acknowledged by MeF with a rejected status, with receipt ID 2d59a07d-57ef-4392-8196-48ac29dce023 . My second submission is submitted and acknowledged by MeF with an accepted status, with receipt ID 0ac15058-9352-49f8-9b84-5e3faed41676.

## Tax Logic
This is a very brief introduction to writing tax logic and the fact graph. The /docs and /direct-file/df-client repos go much farther in depth on these topics and are worth reading!

### Introduction
Direct File's core data model for taxes is a graph, which we call the 'fact graph'. The rationale behind using graph-structures for modeling tax calculations is best articulated in https://arxiv.org/pdf/2009.06103.

### Reasoning about the fact graph
The fact graph is a huge collection of facts, both collected from the user (`writable`) and then `derived` from the `writable` and other `derived` facts. The fact graph is namespaced with a default private scope for each fact unless the need to be exported

**Writable facts**: Facts that are populated by user entered data.
**Derived Facts**: Facts that are calculated based on other facts.

Writing functional tax logic spans both front- and back-end. The main areas where this code lives is:

* [./direct-file/backend/src/main/resources/tax](./direct-file/backend/src/main/resources/tax) for facts and flow additions
* [./direct-file/df-client/df-client-app/src/flow](./direct-file/df-client/df-client-app/src/flow) to add pages to the flow
* [./direct-file/df-client/df-client-app/src/locales/](./direct-file/df-client/df-client-app/src/locales) for content

Tests are different for each type of work, but are primarily written in [./direct-file/df-client/df-client-app/src/test](./direct-file/df-client/df-client-app/src/test).

### Knockouts
Writing or editing knockouts requires you to create facts to prove or disprove something about a taxpayer's situation to knock them out because Direct File doesn't support their situation.

This includes:
* Figuring out the criteria for a knockout. This is often in the ticket and I encourage you to ask all the questions
* Creating or using existing facts that support a knockout case
* If you're adding a knockout to the flow, adding that in
* Creating a knockout stub in the correct spot in the flow
* Tests test tests. Knockouts are mostly tested with the functional flow modality

### API Documentation

When running the backend application locally, OpenApi Documentation can be viewed at:

http://localhost:8080/df/file/api/swagger-ui/index.html

If you want to use the endpoints and be  associated with a specific user, you should use the uuid
in the `external_id` column of the `users` table in the direct file db:
```sql
select
	users.id,
	users.external_id
from
	users
left join taxreturn_owners on
	users.id = taxreturn_owners.owner_id
left join taxreturns on
	taxreturn_owners.taxreturn_id = taxreturns.id
where
	taxreturns.id = '{taxReturnId}';
```
### Local

Backend relies on locally installed Maven packages in order to build; therefore, you can run the `/scripts/build-project.sh` which will install the shared dependencies

```sh
INSTALL_MEF=0 ../scripts/build-project.sh
```

#### Spring Boot Maven plugin

[Spring Boot](https://docs.spring.io/spring-boot/)  
  &nbsp;&nbsp;&nbsp;&nbsp;
  &rarr; [Build Tools Plugins](https://docs.spring.io/spring-boot/build-tool-plugin/index.html)  
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    &rarr; [Maven Plugin](https://docs.spring.io/spring-boot/maven-plugin/index.html)  
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      &rarr; [Running your Application with Maven](https://docs.spring.io/spring-boot/maven-plugin/run.html)

Executing the Spring Boot Maven plugin `run` command will compile, verify and then run the application. Default profiles have been defined as configuration within the `pom.xml`

 ```sh
 ./mvnw spring-boot:run
 ```

A "debug" profile has been defined that enables all the HTTP actuator endpoints and to always show values as configured in `application-debug.yaml` The logging format is restored to the Spring Boot defaults with the "debug" profile to make log entries easier to read vs the current customization to format as JSON for use with log aggregators such as Splunk.

##### Configuration related endpoints

 * [Conditions Report](http://localhost:8080/df/file/api/actuator/conditions) &mdash; `/actuator/conditions`
 * [Configuration Properties](http://localhost:8080/df/file/api/actuator/configprops) &mdash; `/actuator/configprops`
 * [Environment Variables](http://localhost:8080/df/file/api/actuator/env) &mdash; `/actuator/env`

## Development

### Database

The backend relies on a postgres database that can be started independent of other services (from this directory):

If you want to expose the database on a different port than the default (5432), set the environment variable `DF_DB_PORT` to the port you prefer.

```bash
docker compose up -d db
```

This database can be used by itself for local development while running the Spring application on the CLI, through your IDE, or in a container.

### Localstack
The backend uses an AWS mock library `localstack` to enable offline development. We use it specifically for artifact storage in S3 and SQS messaging queues. localstack runs in a docker container which can be started by running:
```bash
docker compose up -d localstack
```

For troubleshooting you can open a shell in the localstack container (```docker exec -it localstack sh```) and run commands AWS CLI commands style commands -- just replace aws with awslocal. Try `awslocal -h` for more details.

### Application

Requirements:
* Java 21 JDK
* [SBT](https://www.scala-sbt.org/) (1.9)

#### Initial Setup

See [ONBOARDING.md - Local Environment Setup](../../ONBOARDING.md#local-environment-setup) for details on getting set up.

Note that if you would like to develop the backend locally and outside of docker, follow the 
[ONBOARDING.md - Building with command line](../../ONBOARDING.md#building-with-command-line) instructions.

##### Ports

By default, the application will run on port 8080.  If you want to change this, set the environment variable 
`DF_API_PORT`. If you have also changed the frontend port, make sure `DF_FE_PORT` has been exported prior to running the
application to ensure fake login redirects work correctly.

#### Remote debugging

To set up remote debug:

```
./mvnw spring-boot:run -Dspring-boot.run.profiles=development -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
```

#### Running in docker

The application can be run in a container locally, and it might be useful, but probably isn't the most convenient way to
do development right now. If you want to use it, cycles essentially are:

```bash
# make some changes, then:
docker compose up -d api
```

Recommended usage at this time is use an IDE for backend development and run the database and frontend in docker.

### Mock Data Import Service

The mock Data Import Service is configured to run in the following environments where the _mock_ Spring Profile has been activated

* local development
* local Docker

#### Reference profiles

The following reference profiles
* `/src/main/resources/dataimportservice/mocks/marge.json`
* `/src/main/resources/dataimportservice/mocks/homer.json`

##### VS Code REST Client

`/src/test/resources/endpoint.http`

#### How to add additional profiles?

To add additional profiles to the mock service, add JSON files to `/src/main/resources/dataimportservice/mocks/` where the file name matches the profile value you will be passing in the `x-data-import-profile` request header



## Running tests

Run the test suite that is executed in CI with:

```bash
./mvnw test
```

## Database migrations

The database schema is managed by [liquibase](https://www.liquibase.org).

Migration history and state are stored in tables named `databasechangelog` and `databasechangeloglock`.  The migrations themselves are stored in [changelog.yaml](src/main/resources/db/changelog.yaml) and accompanying changesets in the `migrations` directory (relative to the changelog).

Liquibase commands can be run using the maven plugin, which is configured by default in this project to run against the local development database.  This configuration is in [.liquibase.properties](.liquibase.properties).

To override this configuration and connect to a different database, use command line options.  For example:

```
./mvnw liquibase:generateChangeLog \
    -Dliquibase.changeLogFile=db/changelog.yaml \
    -Dliquibase.url=jdbc:postgresql://localhost:5432/directfile \
    -Dliquibase.username=postgres \
    -Dliquibase.password=postgres \
```

Substitute the liquibase command you want to run (run `./mvnw liquibase:help` for a list of commands and more information)

### Applying migrations

When the application starts, all migrations that have not been applied will be applied.  This behavior is similar to how `ddl-auto` as long as you aren't making the schema changes yourself.

### Creating new migrations

To add a new migration, add a new migration to [the migrations folder](src/main/resources/db/migrations) and add new `changeSet`(s).
When doing this, it is a good idea to also provide a `rollback` block to reverse each `changeSet`.
A working `rollback` block is also very useful when iterating on a migration locally.
Liquibase can infer how to roll back certain changes automatically. For more information on which commands should have
custom rollback statements, see [Automatic and Custom Rollbacks](https://docs.liquibase.com/workflows/liquibase-community/automatic-custom-rollbacks.html).

An example `changeSet` for adding a column is:

```
  - changeSet:
      id: sample-changeset
      author: directfile
      comment: sample changeset adding a column
      changes:
        - addColumn:
            tableName: users
            columns:
              - column:
                  name: something_new
                  type: TEXT
                  remarks: this is a new column
      rollback:
        - dropColumn:
            tableName: users
            columns:
              - column:
                  name: something_new

```

### Rolling back migrations

To roll back the most recent migration, you could:

```
./mvnw liquibase:rollback -Dliquibase.rollbackCount=1
```

### Static Analysis: Spot Bugs and PMD
We use [SpotBugs](https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html) and [PMD](https://pmd.github.io/pmd/index.html) for static code analysis in this app. The app is configured to have pre-commit hooks run SpotBugs and PMD.

Spot Bugs is a static analysis tool for java projects. SpotBugs runs against _compiled_ code.
Be sure to run `./mvnw compile` to ensure that SpotBugs runs against the latest version of your code.

PMD is a static analysis tool that runs against the source code of the project. You can
run `./mvnw pmd:check` to check for PMD violations or `./mvnw pmd:pmd` to generate the pmd report.

Spotbugs and PMD both generate static analysis reports that can be used to resolve issues in the project.

PMD is configured via [xml file](src/main/resources/pmd/static-analysis-ruleset.xml) that specifies the linting rules we adhere to.

**How do I see the reports?**

To see a formatted HTML page for the static analysis reports you can run:

```bash
./mvnw clean compile site:run
```
This will start a site at `localhost:8080`. Navigate to `Project Reports` and then click on PMD or Spotbugs to view errors in the app.

If you want to ignore the pre-commit hook that runs static analysis, do:

`git commit --no-verify`

To generate each XML report, you can run:
```bash
./mvnw compile spotbugs:spotbugs
```

```bash
./mvnw pmd:pmd
```

To check if the project currently passes static analysis:
```bash
./mvnw compile spotbugs:check
```
  
```bash
./mvnw pmd:check
```

SpotBugs also offers a local gui that displays information based on the output of spotbugs. Calling compile before spotless:gui, ensures
we have all the latest changes reflected in the spotbugs report.

```bash
./mvnw clean compile spotbugs:gui
```

I've also configured the build to generate the spotbugs report when you run `./mvnw clean compile`. SpotBugs looks at the generated target folder
of the project, so doing a `./mvnw clean compile` will ensure you're seeing the latest spotbugs report.

**How do I resolve my SpotBugs / PMD Errors?**

Spotbugs and PMD provide references for how to fix warnings. 

These are the rules for Spotbugs, you can search the page for the warning to understand how to fix it:

- Find Security Bugs Reference: https://find-sec-bugs.github.io/bugs.htm
- SpotBugs Reference: https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html

PMD also has a page with rules and how to address them:

PMD Rule Reference: https://docs.pmd-code.org/latest/pmd_rules_java.html


**For more information on Spotbugs:**

- Docs Site: https://spotbugs.readthedocs.io/en/latest/introduction.html

- Github Repo: https://github.com/spotbugs/spotbugs

- Maven Spotbugs Plugin Docs: https://spotbugs.github.io/spotbugs-maven-plugin/plugin-info.html 

SpotBugs Rules Reference(s):

- Find Security Bugs Reference: https://find-sec-bugs.github.io/bugs.htm
- SpotBugs Reference: https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html

**For more information on PMD:**

- Maven PMD Plugin Docs: https://maven.apache.org/plugins/maven-pmd-plugin/check-mojo.html

- PMD Rule Reference: https://docs.pmd-code.org/latest/pmd_rules_java.html

## Troubleshooting

### Problem
If your db service continuously restarts and when looking at the logs the message indicates:

```
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty.....
```

### Solution
1. Navigate to `/direct-file/direct-file/docker/db/postgres`
2. `rm -rf data`
3. Navigate back to `direct-file/direct-file/backend`
4. try `docker compose up -d`
