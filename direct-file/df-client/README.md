# Getting Started with the frontend application

- [Getting Started with the frontend application](#getting-started-with-the-frontend-application)
  - [Getting started](#getting-started)
  - [Multi-package setup](#multi-package-setup)
  - [Development notes](#development-notes)
    - [Devving the fact dictionary](#devving-the-fact-dictionary)
    - [Fact graph debugging utilities](#fact-graph-debugging-utilities)
      - [Variables](#variables)
    - [Functions](#functions)
    - [How to set and save facts via the variables](#how-to-set-and-save-facts-via-the-variables)
    - [Reset the state of facts locally](#reset-the-state-of-facts-locally)
  - [Testing](#testing)
    - [Running fact dictionary tests](#running-fact-dictionary-tests)
  - [Running a prod build locally](#running-a-prod-build-locally)
  - [Building](#building)
  - [Integrating changes from Scala](#integrating-changes-from-scala)
  - [API documentation](#api-documentation)
  - [Deployment to cloud gov](#deployment-to-cloud-gov)
  - [Using a Virtual Machine](#using-a-virtual-machine)
  - [Translation script](#translation-script)
    - [Export](#export)
      - [Possible errors](#possible-errors)
    - [Import](#import)
    - [Troubleshooting the script](#troubleshooting-the-script)
  - [How to submit](#how-to-submit)
    - [Quickstart](#quickstart)
    - [Troubleshooting](#troubleshooting)
      - [Understanding the submit flow](#understanding-the-submit-flow)
      - [Unhealthy database(s)](#unhealthy-databases)
      - [Investigating the api logs](#investigating-the-api-logs)
      - [Checking env vars](#checking-env-vars)
      - [Testing localstack](#testing-localstack)
      - [Check the database](#check-the-database)
  - [Project maintenance](#project-maintenance)

## Getting started

1. Make sure you have the version of node referenced in [.nvmrc](./.nvmrc). [Installing nvm on Mac](https://tecadmin.net/install-nvm-macos-with-homebrew/). After install add this to your .zshrc or .bash_profile: `source $(brew --prefix nvm)/nvm.sh`. You can use `nvm use` to set the node version.
3. For most pre-submit flows, running the backend is sufficient to support development.
   Run `docker compose up -d api` and validate that api and db are running.
   - Some screens leverage information retrieved from the state-api, so it is also recommended to `docker compose up -d state-api`
     if your local development requires it.
   - For all post-submit flows where tax return data is retrieved from the backend, running the status app is highly recommended
     in order to avoid long waits due to network timeouts during fetches. See the [status README](../status/README.md) to get started.
4. Run `npm install` in df-client directory, to install dependencies
5. Run `npm run start` in df-client directory, to build the application in development mode
6. (Optional) If you want to use the pseudo locale instead of Spanish, you can set `VITE_USE_PSEUDO_LOCALE=true` when starting the server.

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

Use any email to login. The page will reload if you make edits.

## Multi-package setup

We're set up using [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) to run multiple packages. While you
install node modules in the root `df-client` directory, each package can contain its own scripts and build settings.
When a new typescript package is added, we'll need to additionally:

1. Set up tsconfig project references, so that we'll have incremental builds
1. Set up our root package.json to build/test/lint every package and not just the df-client-app folder.

If you want to add a new package now, please talk to Michael Bowman.

## Development notes

### Devving the fact dictionary

If you are modifying the fact dictionary, you'll make changes to xml in the backend resources folder. (find it in the repo, but it should be in the backend resources folder, and symlinked into df-client-app.). For changes to flow through to the client, you'll need to also regenerate code via `npm run generate-fact-dictionary` in df-client-app

1. If you're making a one-off change to the fact dictionary, you can open the `df-client-app` package and run `npm run build`, which will run the generate + compile steps.
2. If you're making a series of changes to the fact dictionary, open a terminal to the `df-client-app` package and run `npm run watch-fact-dictionary`. Now, as you modify the xml, the typescript files will regenerate (and as long as you're running `npm start`, they'll flow and hot reload directly to the frontend).

All major commands (lint, test, build, start) depend on the fact dictionary having been transformed from xml to typescript locally, and have a dependency on the `npm run generate-fact-dictionary` command. If something is ever wrong in a local setup and `facts.js` or `paths.js` cannot be found, try running `npm run generate-fact-dictionary` in the df-client-app package.

### Fact graph debugging utilities

The following global variables and functions are exposed on the client side in development. Run in the console in the browser.

#### Variables

```
  > debugFactGraph
  > debugFacts
  > debugFactGraphMeta
  > debugScalaFactGraphLib
```

### Functions

```
  > loadFactGraph
  > saveFactGraphToLocalStorageKey
  > loadFactGraphFromLocalStorageKey
```

### How to set and save facts via the variables

In order to access the variables and functions mentioned above, one needs to have loaded the checklist. Fill in the first screen of `about-you-intro` section. This will be First, middle, last, dob and occupation. On the next screen, `about-you-contact-info`, open the dev console.

1. To view the factgraph as a JSON object run:

```
> debugFactGraph.toJson()
```

2. The UUID can be found in the first key of the JSON object, ie, `/filers/#b8c9d322-bcf2-4b2e-aa41-b702b2617eed/isPrimaryFiler`, in this case the UUID is `#b8c9d322-bcf2-4b2e-aa41-b702b2617eed`
3. To get the `firstName` fact, run:

```
> debugFactGraph.get('/filers/#b8c9d322-bcf2-4b2e-aa41-b702b2617eed/firstName').get
```

4. to overwrite this fact, one can run:

```
> debugFactGraph.set('/filers/#b8c9d322-bcf2-4b2e-aa41-b702b2617eed/firstName', 'newName').
> debugFactGraph.save()
```

5. Run step 3 to see if it's been overwritten.
6. Load the `about-you-intro` screen again to see the new name appear in the UI.

### Reset the state of facts locally

1. Run `debugFactGraph.download()` to save the fact graph into a local text file.
2. Remove any existing facts you want.
3. Run `loadFactGraph()` and pass in the edited JSON as a string; use backticks (`) instead of regular quotes (" or ') to correctly handle newlines.

## Testing

`npm run test:ci`

Launches the test runner in the interactive watch mode. Learn more about [Vitest](https://vitest.dev/guide/)

### Running fact dictionary tests

`npm run test factDictionaryTests`

To get a coverage report for the fact dictionary, run the tests, then navigate to:
`/direct-file/direct-file/df-client/df-client-app/coverage/factDictionaryCoverage.html`

## Running a prod build locally

In certain situations (e.g. perf testing), you'll want to run a production build locally.
The command `npm run preview` will use `vite preview` to do so. However, you'll need to modify
your `.env.production` file to be a copy of your `.env.development` file, or else the
fake auth controller will not work

## Building

`npm run build`

Builds the app for production to the `build` folder.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Integrating changes from Scala

1. Build your scala changes in `fact-graph-scala` with `sbt fastOptJS`
2. Copy those files over by running `npm run copy-transpiled-js` in `df-client-app` (TODO: this script should really move to the js-factgraph-scala package)

## API documentation

The frontend uses the Java API for communicating with the backend. Documentation for endpoints is available at http://localhost:8080/swagger-ui/index.html

Accessing changes to the documentation requires building the backend. In docker, run `docker compose up -d --build`

## Using a Virtual Machine

From time to time, you’ll need to test in an Windows environment, particularly when you need conduct testing with Windows-based screen readers, like NVDA.

Before you proceed, you’ll need the following:

- Parallels (VirtualBox has spotty support for some of the newer Macs)
- [NVDA](https://www.nvaccess.org/download/)

First, you’ll want to follow steps to configure. You can follow [these steps](https://gist.github.com/ernsheong/23c00e65219b10db7bc072772ea509d4#access-macos-localhost-from-ie-or-edge-within-parallels-desktop). The most important part is making sure the IP address name is set to `localmac` for the next steps.

Next, start the app:

```
$ npm run start:windows
```

## Translation script

Points of contact are:

- Post in #Shared-tax-client for transparency

This is a three part process

1. Export English strings from en.yaml to an Excel workbook
2. Hand workbook to translation team and get result
3. Import Spanish strings to es.yaml from the workbook

### Export

The `export-locales` script will parse the en.yaml file and separate the content into an XLS file. It goes through flow.tsx screen by screen and it extracts each page, then each component within that page, and does its best to grab all the keys associated with it.
It does need to find the keys associated with components so this is somewhat hit and miss at times, especially when new components created.
To simplify somewhat It just pulls in all fields under a parent key.

The XLS file will have a separate sheet per category of the flow.

You can export all locale copy by running the following command from the `df-client` directory:

```
npm run export-locales --workspace=@irs/df-client-app
```

#### Filters

##### Filter by screens

You can also filter the results to only include the copy referenced in specific screens by creating a plain text file and passing the file path to the screen, with the `-s` flag. The plain text file's name can be anything you want.

The list of screens should have each screen name on its own line. For example:

```
about-you-intro
about-you-basic-info
est-tax-payments-intro
sign-return-mfj-submit
```

The command to run export-locales, from the df-client directory, with a list of screens (as described above), with the output written to screen.txt in the df-client directory, would be:

```
npm run export-locales --workspace=@irs/df-client-app -- /path/to/screens.txt
```

##### Filtering by batches

The script also supports filtering by batches. Batches can be pass directly to the command or by using a list file like we used for screens. The batch names or path to batch file can be passed directly using the `-b` flag.

If passing the batch names directly, running the command from the df-client directory is:

```
npm run export-locales --workspace=@irs/df-client-app -- -b "edc-0 hsa-0 ptc-0"
```

If you are using a list file (same format at other filters, but containing batch names instead) you would instead pass the path to the list file like this:

```
npm run export-locales --workspace=@irs/df-client-app -- -b /path/to/batches.txt
```

##### Filtering by keys

You can also optionally provide a path to a file following the same format as the screens list which contains a list of
keys or key prefixes which will filter the worksheet to only those keys or keys that start with those values. Entries
that start with `*` will match any keys that contain this substring (e.g., `*cdcc` will match all keys that contain the
string `cdcc`).

This can be used independently from the screens list or together. If used in combination with the screens list, any
provided keys not identified as a part of one of the list screens by the script will be included in an "unseen copy" tab
within the worksheet.

Example command using both a screens list and keys list.

```
npm run export-locales --workspace=@irs/df-client-app -- -s /path/to/screens.txt -k /path/to/keys.txt
```

##### Combining filters

All these filters can be combined with each other at the same time. If multiple filter flags are provided, the content must pass _all_ filters.

#### Translation Suggestions

You can also pass the `-d` flag to the script in order to export the worksheet with embedded comments pointing out and
listing duplicate English keys as well as any existing Spanish content that those script correspond to. The row
containing the duplicate content will also be highlighted to draw attention to the comment.

If duplicate English _is_ detected and there is no more than one available, the script will also pre-fill the Spanish column with the matching English copy that it finds.

Any content that seems to contain no translatable content (i.e., it contains only variables or nested translation references) will also be highlighted and (if empty) pre-filled with a copy of the English copy.

#### Output

The exported XLS files will be located at `df-client/df-client-app/exported-locales`

In the XLS files there are a number of columns

- English (current) - this column is pulled from en.yaml
- Esp (current) - may remove any TRANSLATE ME string if they exist before handing to translation team

#### Possible errors

- Skipping fact - these are likely to be ok, not an issue
- Unable to find - these are NOT ok, we should find the keys
- “Was unable to identify” - NOT ok, maybe there’s a new component we need to handle

Note: There’s a list of not rendered node types, like SetFactAction

### Import

After getting the XLS file back, you may want to note which column the translations are in. This can sometimes vary.

Once you've identified the target column to import, pass it as the first argument to the script.

When importing its best to import in order that the XLS were provided, per category.

If the updated Spanish is in column E, the import command could looke like:

```
npm run import-locales --workspace=@irs/df-client-app -- E `realpath ./about-you-missing_2024-2-1.xlsx`
```

The output is entirely dependent on the key,
It will go through every worksheet and on every tab

- Ignores the name of the tab
- Ignores the grey cell subcategory, green cell screen - these are only for human viewers.
- Only thing it cares about is the i18n key

Things to remember:

- If a yaml array doesn’t exist on the Spanish side yet then it doesn’t properly insert the keys, it adds “0” - instead. Regex search to fix `"\d+":` → `-`
- Pages that are not in the flow are not processed by this script. Currently need to be done by hand.
- If the output mentions that a given row "may have diverged from English", you should compare the spreadsheet to the current English copy, to determine if they need to be sent back to translation or resolved manually. Sometimes the changes are just a typo fix in the English and don't require any followup action. Use your discretion to determine what resolution, if any, is needed.

### Troubleshooting the script

If you get an error about around `throw new Error` , you can replace `throw new Error` with `logger.error`

If there are other errors, you can try rebuilding with `npm run build` and try re-running the `export-locales` script

## How to submit

### Quickstart

Ensure that you have the following environment variables set.

```
export FACTGRAPH="/path/to/fact-graph-scala"

# set the following to false:
export DF_TIN_VALIDATION_ENABLED="false"
export DF_EMAIL_VALIDATION_ENABLED="false"
```

Put them in a git-ignored file for convenience. Here we are using `direct-file/df-client/.env.local`.

Add to this file the variables found in [ONBOARDING.md](./../../ONBOARDING.md)

Then run

```
source ./direct-file/df-client/.env.local  # <-- use your own path
docker compose up -d api mef-submit mef-status state-api
```

### Troubleshooting

If you're here, then maybe the above didn't work for you. Let's start with what should be happening when a TP submits.

#### Understanding the submit flow

1. click submit, HTTP call to taxreturn/{id}/submit
2. calls go to the Backend App (made up of the Direct File API, Status Change Queue, Submission Confirmation Queue and Direct File DB). The Direct File API (docker container name: `api`), receives the taxreturn as JSON and converts it to an XML taxreturn. This XML needs to be validated by the XML schema that MeF provides to us. Once it's validated, it's placed on the Dispatch Queue (formerly called Filing Request Queue) within the Mef Submit App. Note - XML validation failure is a common cause of local clients not being able to submit (most likely XML content not XML structure).
3. The Mef Submit App (made up of the Dispatch Queue and Submit App and docker container name: `mef-submit`), then submits the taxreturn to the actual MeF (on prem). After the taxreturn is submitted, it then responds with accepted or rejected. This is sent to other queues in our system.
4. This status (accepted/rejected) from MeF is placed in the Mef Status App (made up of the Status Request Queue and the Mef Status App and docker container name: `mef-status`). The Status App will notify the Backend App if and when the status changes (by writing to the Status Change Queue).
5. The Backend App then propagates the status back to the client.

The first thing is to double check the env variables with someone who already has these values. Also make sure you have the latest main.

Start by bringing up only the bare minimum to start troubleshooting submission. Run

```
docker compose down
docker compose up -d api
```

#### Unhealthy database(s)

If terminal states that any database is unhealthy or any database service doesn't start in docker desktop, find the data folder for the unhealthy database and delete it.

Let's say the docker container named `db` (should work with `mef-apps-db` or `state-api-db` also) was showing as unhealthy. You could click on `db` in the docker desktop, then click on `Bind Mounts`. You'll see an `init` and a `data` path. Click on the `data` path. This should open the finder/explorer allowing you to delete / trash it.

After deleting the data directory you can restart the `db` and `api` service clicking stop and play. Restart the client app and try to submit again.

#### Investigating the api logs

Start by looking at the logs for the `api` service in docker desktop. Are there any errors?

- If you see a test that is failing, like UserApiAllowlistEnabledTest, you can disable this test, by placing an `@Disabled` over the test.
- search the logs for "validating packed return data against schema". This is the last step of the JSON to XML conversion. The logs after this will represent the XML validation. First error after this (validating packed ...) log message could provide insight.
- when trying to submit if it doesn't find the network it wants, try rebuilding with --no-cache flag (need Steve M. to expand on this)

#### Checking env vars

- click on the `api` service in docker desktop
- click on the `Inspect` tab
- click on the `Env` button
- look for the `Env` key and validate that all the env. variables are set to expected values

#### Testing localstack

Once the XML is validated, the XML persisted to AWS (S3). Localstack is running AWS services locally on port 4566. We can validate localstack is running by bringing up some services:

- http://localhost:4566/direct-file-taxreturns

The last link should have a bunch of XML tags that look like this with a submission id:
<Key>2023/taxreturns/{some-UUID}/submissions/{submission-id}.{[json|xml]}

Note - The Direct File API is creating the submission-id and uploading to an S3 bucket. In the submit app, the message in the queue, tells us where the submission XML is, in the S3 bucket. Those <Keys> tell the submit app where the submission is.

Grab the submission-id and search the `api` logs for this submission id. Once submission happens, there will be a message added to the Dispatch Queue that there's a message (see Body tag):

- https://s3.localhost.localstack.cloud:4566/_aws/sqs/messages/us-west-2/000000000000/dispatch-queue

If `mef-submit` isn't running, we can expect to see the message sitting in the queue.

If you run `docker compose up -d mef-submit`, it should read the message from the queue and submit it to MeF. You can check the logs in `mef-submit` for

- "Successfully Submitted 1 submissions for batch..."
- "Submitted return with submissionID: {submission-id}, receiptID: {receiptID}
- "Sent a list of tax returns ids and submission ids to SQS submission-confirmation-queue"
- "Sent a list of tax returns ids and submission ids to SQS pending-submission-queue"

Both the Backend App and the Status App get a notification when tax return has been submitted.

The [pending-submission-queue](https://s3.localhost.localstack.cloud:4566/_aws/sqs/messages/us-west-2/000000000000/pending-submission-queue). This is the queue the Status App will be reading from. You can check for messages.

The [submission-confirmation-queue](https://s3.localhost.localstack.cloud:4566/_aws/sqs/messages/us-west-2/000000000000/submission-confirmation-queue). This is the queue the Backend App will be listening to. This should be empty because the Backend App (aka `api`) is running so it would have read the message from the queue soon after message was placed in the queue. We can check the logs in `api` for:

- "Received SQS Message {message details}

run `docker compose up -d mef-status state-api` to bring up the remaining containers.

#### Check the database

If the XML validation succeeded, you can check that the submissions are in the database

- click on the `db` docker container
- click on `Exec` tab
- run `psql`
- run `\l` to list the databases
- run `\c directfile` to connect to the directfile database
- run `\d` to list the tables
- run `select * from taxreturn_submissions;` to see if there are any submissions

## Project maintenance

Needed by Docker image used to build

- @rollup/rollup-linux-arm64-gnu
