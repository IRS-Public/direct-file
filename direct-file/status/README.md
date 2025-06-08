# MEF Status

## About MeF Status
The MeF Status application's job is to:
- Regularly poll MeF to learn about the status of each submitted tax return, until we receive a final status. A final status is one that will not change: Accepted, Rejected, or an error that will not get resolved without intervention.
- Save the final status for each tax return where it can be accessed by the backend application

### How it works

- At the time a tax return is submitted, the mef-submit app creates a submission ID and notifies the status application via message queue that there is a new tax return to begin polling for.
- MeF status periodically queries the status database to find a list of pending tax returns.
- MeF status (this application) then queries MeF (the external API) for batches of those returns. When it receives a final response from MeF (generally "accepted" or "rejected") for any one of those returns, it saves the results to the status database. Returns that remain in pending status will be polled for at the next interval.

## Setup

> [!NOTE]
> For setup please see the most up-to-date instructions which are found in the [Onboarding docs](../../ONBOARDING.md).

### MeF SDK

2. Once you have that variable set, run the
build-project.sh script from the
`submit` folder of the direct_file project.

### Proxy
If you use a proxy, first see `MAVEN_OPTS` in [the project readme](../README.md#important-configuration-variables) and [the OMB Connect readme](../README-omb-connect.md) for information about ensuring your proxy settings are passed to all build steps.

## Docker

Ensure you have the environment variables set (see [Environment](#environment) below).
You may be able to run with only `STATUS_ETIN` set, using the test value from the [submit README](../backend/README.md).

Build the application:

```bash
docker compose build
```

Then run it:

```bash
docker compose up -d mef-status
```

The app probably failed for you due to lack of configuration.  You can look at the reason why it failed to start with:

```bash
docker compose logs mef-status
```

## Running locally

### Environment

Set the following environment variables in your local environment which will facilitate running both the applications as well as the docker containers.  On MacBooks, placing the export statements below in the `.zshrc` (gets run and evaluated every time a shell instance is started) or `.zprofile` (gets run and evaluated when a user logs in) file will accomplish this.  If using the bash shell, placing them in `.bashrc` should do (and effectively behave similar to `.zshrc`).

```
# Get the keystore alias from a fellow developer and replace the value in between quotes with the actual value
export STATUS_KEYSTOREALIAS="[keystore-alias]"

# Get the base64 encoded keystore from a fellow developer and replace the value in between quotes with the actual value
export STATUS_KEYSTOREBASE64="[base64-encoded-keystore]"

# Get the keystore password from a fellow developer and replace the value in between quotes with the actual value
export STATUS_KEYSTOREPASSWORD="[keystore-password]"

# Get the ASID value for the status application from a fellow developer and replace the value in between quotes with the actual value
export STATUS_ASID="[status-asid]"

# Get the EFIN value for the status application from a fellow developer and replace the value in between quotes with the actual value
export STATUS_EFIN="[status-efin]"

# Get the ETIN value for the status application from a fellow developer and replace the value in between quotes with the actual value
export STATUS_ETIN="[status-etin]"
```

You'll also need to set up the `LOCAL_WRAPPING_KEY` following the instructions in the [backend README](../backend/README.md#initial-setup)

```
export LOCAL_WRAPPING_KEY="[local-wrapping-key]"
```

### Static Analysis: Spot Bugs and PMD

For notes and usage on spotbugs see the [Backend API README Spot Bugs section](../submit/README.md#static-analysis)
