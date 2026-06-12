# Onboarding
__Table of Contents__

1. [Quickstart](#quickstart)
1. [Codebase Overview](#codebase-overview)
2. [Local Environment Setup](#local-environment-setup)
1. [Software Installs](#software-installs)
    * [Required Software](#required-software)
    * [Optional Software](#optional-software)
    * [Installing software using Homebrew](#installing-software-using-homebrew)
    * [Installing software using SDKMAN!](#installing-software-using-sdkman)
2. [Source Code](#source-code)
3. [Environment Variables](#environment-variables)
4. [Building with Docker - RECOMMENDED](#building-with-docker)
5. [Building with command line &mdash; _local builds_)](#building-with-command-line)
    * [Install shared dependencies](#install-shared-depedencies)
    * [Stand up development containers](#stand-up-development-containers)
    * [Build individual Spring Boot projects](#build-individual-spring-boot-projects)
        * [Email-service](#email-service)
    * [Build the client app](#build-the-client-app)
4. [Application Tests](#application-tests)
    * [Code Coverage](#code-coverage)

# Quickstart
To run everything:

```bash
docker compose up -d --build
```

The backend application is available at http://localhost:8080 and the postgres database is exposed on port 5432 with username and password `postgres`.

When you're finished, tear it down with `docker compose down`.
 

We typically recommend running the front end components locally instead of through Docker to allow for hot reloading when making changes. Run the following from /direct-file/df-client
```bash
npm run start
```

The front end application is available at http://localhost:3000

# Codebase Overview
The below provides an introduction to various portions of the codebase. Most applications in our system come with a readme.md to explain what they are for.  Follow the instructions there on how to build.
> n.b. Most, but not all, of the applications run in docker via running `docker-compose up --build` in the /direct-file directory. In particular, the applications that interact with MeF (status and submit) are read-only and are not included in the docker compose file.
> 
> Direct File consists of a frontend React application, a suite of backend Java services, and a shared Scala library that ensures that taxpayers receive accurate error messages and UX flow for the tax rules that apply to them.

#### direct-file

Direct file is the home for the vast majority of our code.  It is split into sub directories, many of which are applications in and of themselves.

#### direct-file/fact-graph-scala
The fact graph is the logical framework by which we store user information and calculate tax information.  It is written in Scala and transpiled to JavaScript so that it can be used on the front end.  It can be helpful to think of it like Excel.  There are cells that a person writes in, and then there are a bunch of formulae that use the user entered information and calculated information.

#### direct-file/js-factgraph-scala
This is the module that contains the fact graph and the operations in the fact graph for the front end.

#### direct-file/backend
This application is the front door to our non-UI systems.  It is responsible for integrating with an auth provider, generating tokens for our system, accepting user data, and maintaining user information. A bit more monolithic than we might have wanted but oh well.

#### direct-file/df-client/
Taxpayer facing frontend and UI. Utilizes the transpiled fact graph as the logical engine to control which screens are displayed.  This is also the home for the flow, which is the configuration of which screens will be shown and under what conditions.

The frontend app is further in the `df-client-app` directory, whereas other frontend packages can exist at the `df-client` level. We use npm workspaces to connect our packages.

#### direct-file/submit
Submits tax returns to MeF

#### direct-file/status
Polls MeF for tax return acknowledgements

#### direct-file/email-service
SMTP relay service for sending emails to taxpayers, triggered on various system or MeF events

#### direct-file/state-api
Backend service responsible for the handling A2A traffic from state tax software providers via a REST API. These APIs are used to access federal return data (XML and return status). After a taxpayer submits their federal return, they may authorize the transfer of their federal return data with their state and the state tax software will pull that data through state-api.

## Local Environment Setup

__Table of Contents__
1. [Software Installs](#software-installs)
    * [Required Software](#required-software)
    * [Optional Software](#optional-software)
    * [Installing software using Homebrew](#installing-software-using-homebrew)
    * [Installing software using SDKMAN!](#installing-software-using-sdkman)
2. [Source Code](#source-code)
3. [Environment Variables](#environment-variables)
4. [Building with Docker - RECOMMENDED](#building-with-docker)
5. [Building with command line &mdash; _local builds_)](#building-with-command-line)
    * [Install shared dependencies](#install-shared-depedencies)
    * [Stand up development containers](#stand-up-development-containers)
    * [Build individual Spring Boot projects](#build-individual-spring-boot-projects)
        * [Email-service](#email-service)
    * [Build the client app](#build-the-client-app)

### Software Installs

Table of Contents
1. [Required Software](#required-software)
2. [Optional Software](#optional-software)
3. [Installing software using Homebrew](#installing-software-using-homebrew)
4. [Installing software using SDKMAN!](#installing-software-using-sdkman)

#### Required Software

* Java
* Scala
* Maven
* SBT
* coursier
* Docker for Desktop

There are instructions below for using `Homebrew` or `SDKMAN` to install the required software. You should only follow one path or the other, unless the instructions tell you to do otherwise (i.e. `SDKMAN` doesn't currently support `coursier`, so you might use `Homebrew` for that).

#### Optional Software

* Homebrew
* SDKMAN!
* Visual Studio Code
* IntelliJ Community Edition

#### Installing software using Homebrew

You will need to install SBT (a build tool for Scala, does it mean Scala Build Tool?) in order to run some of the below steps, if using macOS, it is recommended that you install [Homebrew](https://brew.sh/) first and then use brew to install SBT

* Run the following command in a terminal

    ```sh
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```

* Then either in your `.zshrc` or `.zprofile` file paste the following

    ```sh
    # Set PATH, MANPATH, etc., for Homebrew.
    eval "$(/opt/homebrew/bin/brew shellenv)"
    ```

* Then simply install SBT as documented [here](https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Mac.html#)

    ```sh
    brew install sbt
    ```

* You will also need to install Scala, Coursier, Java, Maven, and Docker

    ```sh
    brew install --cask docker
    ```

    ```sh
    brew install scala maven openjdk@21 coursier
    ```

* If you had another JDK installed, you may need to link the java 21 JDK

    ```sh
    brew unlink openjdk
    ```

    ```sh
    brew link --force openjdk@21
    ```

* Add to your `.bash_profile` to ensure maven finds the correct version of java

    ```sh
    export JAVA_HOME=$(brew --prefix openjdk@21)
    ```

* Configure Coursier to use the right version of Java for the direct file project. You may wish to add this to your .bash_profile or .zshrc to ensure it runs every time you load a new terminal.

    ```sh
    eval "$(coursier java --jvm 21 --env)"
    ```

* Run Docker (from spotlight search on Mac). The Docker icon should appear in your status bar. You may wish to configure Docker to run at login/startup.

#### Installing software using SDKMAN!

Most of the project dependencies can be installed using [SDKMAN!](https://sdkman.io/), a CLI and API for managing SDKs from the JVM and beyond. SDKMAN! supports installation of Java, Scala, sbt, and Maven.

> Please note that support for installation of Coursier using SDKMAN! is currently under development, so this is the one tool we'll need to install manually.

* First, install SDKMAN! using the following command in a terminal:

    ```sh
    curl -s "https://get.sdkman.io" | bash
    ```

* Then, open a new terminal OR run the following in the same shell to enable SDKMAN! in the current terminal:

    ```sh
    source "$HOME/.sdkman/bin/sdkman-init.sh"
    ```

    > SDKMAN! will configure your $JAVA_HOME automatically to point to `"$HOME/.sdkman/candidates/java/current"` by default.

* You can install the latest stable version of your SDK tools using its canonical name without specifying a version:

    > You can use the `sdk list {package}` command to list out available versions. (eg., `sdk list java` will show you available OpenJDK builds).

    ```sh
    sdk install java
    ```

    ```sh
    sdk install sbt
    ```

    ```sh
    sdk install scala
    ```

    ```sh
    sdk install maven
    ```

* Until SDKMAN! supports Coursier officially, you'll need to manually install it here.
    * Either consult the Homebrew instructions above, or follow their official [CLI installation](https://get-coursier.io/docs/cli-installation) steps:
        * On Apple Silicon (M1, M2, ...):

            ```sh
            $ curl -fL https://github.com/VirtusLab/coursier-m1/releases/latest/download/cs-aarch64-apple-darwin.gz | gzip -d > "$HOME/.local/bin/cs"
            ```

        * Otherwise:

            ```sh
            curl -fL https://github.com/coursier/launchers/raw/master/cs-x86_64-apple-darwin.gz | gzip -d > "$HOME/.local/bin/cs"
            ```

        * Then

            ```sh
            chmod +x cs
            ```

            ```sh
            ./cs setup
            ```

            You'll want to make sure that `cs` is available on your `$PATH`.

* Then, configure Coursier to use the right version of Java for the direct file project. You may wish to add this to your .bash_profile or .zshrc to ensure it runs every time you load a new terminal.

    ```sh
    eval "$(coursier java --jvm 21 --env)"
    ```

* Run Docker (from spotlight search on Mac). The Docker icon should appear in your status bar. You may wish to configure Docker to run at login/startup.

### Source Code

* Clone this repo

### Environment Variables

1. Add the following environment variables to your system, on macOS you can add the following lines to your shell's root config file (i.e. the `.zshenv`, `.zshrc`, or `.bashrc` file). Note that you will need to edit most variables.

    ```sh
    export MEF_REPO=~
    export INSTALL_MEF=0
    export LOCAL_WRAPPING_KEY="9mteZFY+gIVfMFywgvpLpyVl+8UIcNoIWpGaHX4jDFU="
    export MEF_SOFTWARE_ID="[mef-software-id]"
    export MEF_SOFTWARE_VERSION_NUM="2023.0.1"
    export STATUS_ASID="[status-asid]"
    export STATUS_EFIN="[status-efin]"
    export STATUS_ETIN="[status-etin]"
    export SUBMIT_ASID=$STATUS_ASID
    export SUBMIT_EFIN=$STATUS_EFIN
    export SUBMIT_ETIN=$STATUS_ETIN
    export DF_TIN_VALIDATION_ENABLED=false
    export DF_EMAIL_VALIDATION_ENABLED=false
    export STATUS_KEYSTOREALIAS="[keystore-alias]"
    export STATUS_KEYSTOREBASE64="[base64-encoded-keystore]"
    export STATUS_KEYSTOREPASSWORD="[keystore-password]"
    export SUBMIT_KEYSTORE_KEYSTOREALIAS=$STATUS_KEYSTOREALIAS
    export SUBMIT_KEYSTORE_KEYSTOREBASE64=$STATUS_KEYSTOREBASE64
    export SUBMIT_KEYSTORE_KEYSTOREPASSWORD=$STATUS_KEYSTOREPASSWORD
    export SUBMIT_ID_VAR_CHARS="zz"
    export GIT_COMMIT_HASH="$(cd /path/to/direct-file && git rev-parse --short main)"
    ```

2. From the root directory of this repo, run the following command to generate a value for LOCAL_WRAPPING_KEY:

    ```sh
    ./direct-file/scripts/local-setup.sh
    ```

3. Re-load your environment so that the new `LOCAL_WRAPPING_KEY` value is loaded. If you set the values in one of your shell dotfiles (e.g. `.zshrc`), open a new terminal.

### Building with Docker

1. To work with the Direct File docker setup, change into the `direct-file` subdirectory of this repo.

    ```sh
    cd direct-file/
    ```

#### Default Services/Containers

1. Run the following command to build and start the default services and containers:

    ```sh
    docker compose up -d --build
    ```
    
    1. You should see the following (among other) containers start up:

        * direct-file-app &mdash; df-client | `df-client`
        * direct-file-db
        * state-api-db
        * direct-file-csp-simulator &mdash; csp-simulator | `/utils/csp-simulator`
        * localstack
        * direct-file-api &mdash; api | `/backend`
        * state-api &mdash; state-api | `/state-api`
        * direct-file-email-service &mdash; email-service | `/email-service`
        * redis

##### Troubleshooting

1. If you get a build error with the `docker compose` command, you can try a few things.
    1. If the error is related to running out of memory, you may need to increase the amount of memory you've allocated to docker to 16 GB.
    2. Otherwise, you can try building without cache:

        ```sh
        docker compose build --no-cache
        ```

        and then re-run the previous command:

        ```sh
        docker compose up -d
        ```

2. If you have issues starting direct-file-db, state-api-db, and email-service-db, this can be fixed by setting the correct ownership on the data folders
   1. This can be confirmed by checking the container logs and seeing the following errors: 
      <br/> `chown: cannot read directory '/var/lib/postgresql/data': Permission denied`
      <br/> `chmod: changing permissions of '/var/lib/postgresql/data': Operation not permitted`

        ```sh
        chown -R 999:999 ./docker/db/postgres
        chown -R 999:999 ./state-api/docker/db/postgres
        chown -R 999:999 ./email-service/docker/db/postgres
        ```

#### Resources

That's it!

Some quick links:

* API documentation for the backend app can be viewed at http://localhost:8080/df/file/api/swagger-ui/index.html
* To access Direct File through the CSP simulator in browser, go to http://localhost:5000/ and use any email and select `IAL2` to login

### Building with command line

1. [Install shared dependencies](#install-shared-dependencies)
2. [Stand up development containers](#stand-up-development-containers)
3. [Build individual projects](#build-individual-spring-boot-projects)

#### Install shared dependencies

*Note: Direct File shell scripts use Maven Wrapper; therefore they need to be executed from a working directory where it is present*

1. Navigate to the `direct-file/libs` directory which has the Maven Wrapper.

   ```sh
   cd direct-file/libs
   ```

2. Run the `build-dependencies.sh` to build and install Direct File shared dependencies.

   ```sh
   INSTALL_MEF=1 ../scripts/build-dependencies.sh
   ```

#### Stand up development containers

Use Docker to build database containers and AWS mock services (referred to as "localstack")

 ```sh
 docker compose up -d db mef-apps-db localstack
 ```

The command below will display all running containers and can be used to validate the above command was successful

 ```shell
 docker ps
 ```

If successful, you should see three images running: localstack, direct-file-mef-apps-db, and direct-file-db.

#### Build individual Spring Boot projects

__Spring Boot projects__
* backend
* email-services
* state-api
* status
* submit

Navigate to a `<project>` directory and use the Spring Boot Maven plugin to build and run.

```sh
./mvnw spring-boot:run -Dspring-boot.run.profiles=development
```

##### Email-service

```sh
# make sure the docker container for state-api is down as the following commands use the same localhost port
docker compose down state-api

# will start up the application using the blackhole profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=development

# prints a log message to the console instead of attempting to send an email
./mvnw spring-boot:run -Dspring-boot.run.profiles=blackhole

# will attempt
./mvnw spring-boot:run -Dspring-boot.run.profiles=send-email
```

#### Build the client app

Need to run/develop the client app? Check out the [df-client/README](/direct-file/df-client/README.md) for info on getting your local environment setup.

## Application Tests

Each application has its own set of tests. To run server-side tests within an app, navigate to the root of the app. Run:

```sh
cd direct-file/<project>
./mvnw test
```

To run a test individually, run `./mvnw -Dtest=<Name of Test> test` with the test name. For example:
```sh
./mvnw -Dtest=TaxReturnServiceTest test
```

__NOTE__ - add the `-X` flag to any maven command to switch on debug logging

```sh
./mvnw spring-boot:run -Dspring-boot.run.profiles=development -X
./mvnw -Dtest=TaxReturnServiceTest test -X
```

### Code coverage

We use a plugin called [Jacoco Maven](https://www.eclemma.org/jacoco/trunk/doc/maven.html) to run code coverage.
To run code coverage in any particular app:

```sh
 ./mvnw jacoco:report
```
To view the generated report, go to `<app_name>/target/site/jacoco/index.html` and open it in a browser.


