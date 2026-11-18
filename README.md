# EventPulse

EventPulse is a cloud-based event management and notification platform for organisations, colleges, and communities. Administrators create and manage events, users register, and the platform sends event announcements and scheduled reminders.

## Architecture

- **Frontend:** React, TypeScript, Vite, React Router, and AWS Amplify Auth.
- **Backend:** modular Java 21 application built with Maven and AWS SDK for Java 2.x. Multiple AWS Lambda entry points use shared handlers, services, and repositories; there is no Spring Boot server or microservices deployment.
- **AWS:** API Gateway HTTP API, Cognito, DynamoDB, EventBridge Scheduler, SES, and CloudWatch.
- **Infrastructure:** AWS SAM / CloudFormation in `ap-southeast-2` (Sydney).

The frontend authenticates with Cognito and sends access tokens to API Gateway. The API Gateway JWT authorizer validates tokens, and backend handlers enforce ownership and ADMIN permissions using verified claims. DynamoDB stores events, registrations, profiles, and notification history. EventBridge Scheduler invokes reminder processing; SES handles email. See [architecture](docs/architecture.md), [database design](docs/database-design.md), [API documentation](docs/api-documentation.md), and [backend details](backend/README.md).

## Repository layout

```text
backend/          Java Lambda code, Maven build, and backend tests
frontend/         React application and frontend tests
infrastructure/   SAM/CloudFormation template and SAM configuration
docs/             Architecture, database, and API documentation
```

## Local setup

### Prerequisites

- Java 21 and Maven
- Node.js and npm
- AWS SAM CLI for template validation and local packaging
- AWS CLI only when reading an already-deployed stack or preparing a deployment

No AWS credentials are needed for the unit tests or frontend production build. `sam build` packages the application; it does not deploy resources. Docker and AWS-compatible local emulators are not configured as part of this repository.

### Backend

From `backend/`, run:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
mvn -s maven-settings.xml clean test
```

Use the JDK 21 installation path on your machine. The Maven settings file configures the project's dependency mirror. Most backend tests use JUnit, Mockito, and mocked AWS SDK clients; they do not require live AWS services.

### Frontend

From `frontend/`:

```powershell
npm ci
Copy-Item .env.example .env.local
# Edit .env.local with the values for your deployed API and Cognito app
npm run dev
```

Required browser configuration (see [frontend/.env.example](frontend/.env.example)):

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API Gateway HTTP API base URL |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool identifier |
| `VITE_COGNITO_APP_CLIENT_ID` | Public Cognito app client identifier |
| `VITE_AWS_REGION` | Cognito region; expected to be `ap-southeast-2` for this project |

These `VITE_` values are embedded in the browser bundle and must contain only public identifiers and URLs. Never place AWS credentials, app client secrets, or private keys in frontend environment files. Authenticated screens and API workflows require a deployed User Pool and API; without configuration, the app shows setup or connection errors rather than fabricated records.

## Verification commands

Run from the repository root unless noted:

```powershell
# Backend unit tests
Push-Location backend
mvn -s maven-settings.xml clean test
Pop-Location

# SAM template validation and local artifact packaging
$env:MAVEN_ARGS = '-s maven-settings.xml'
sam validate --template-file infrastructure/template.yaml
sam build --template-file infrastructure/template.yaml

# Frontend build and unit/component tests
Push-Location frontend
npm run build
npm test
Pop-Location
```

These commands validate code, frontend bundles, tests, and SAM configuration locally. They do not provision infrastructure, send email, create schedules, or execute real Cognito/API workflows.

## Implemented API workflows

The frontend integrates event browsing and ADMIN event management, user registrations and cancellation, ADMIN event registration views, read-only notification history, and separate user/admin dashboards. Important routes include `GET /events`, `GET /events/{eventId}`, event CRUD at `/events`, registration routes under `/events/{eventId}/registrations` and `/registrations/{registrationId}`, `GET /users/me/registrations`, `GET /users/me/notifications`, and `GET /admin/dashboard`. The backend README and API documentation describe request fields and response shapes.

## Deployment prerequisites

Deployment is intentionally outside the local verification workflow. Before an operator deploys the SAM stack, they need an AWS account and appropriately scoped deployment credentials, SAM/CloudFormation permissions, the target region `ap-southeast-2`, a verified SES sender address (and SES production access if sending to unverified recipients), and the hosted frontend origin for CORS. The committed SAM configuration contains no sender address. The template defaults `FrontendOrigin` to `http://localhost:5173` for local development; production deployments must override it with the exact hosted frontend origin.

Supply deployment-specific values interactively so they are not written into shell history or committed configuration. From the repository root in PowerShell:

```powershell
$sesSenderEmail = Read-Host 'Verified SES sender email'
$frontendOrigin = Read-Host 'Hosted frontend origin (for example https://events.example.org)'
sam deploy --config-file samconfig.toml --template-file infrastructure/template.yaml --parameter-overrides "SesSenderEmail=$sesSenderEmail" "FrontendOrigin=$frontendOrigin"
Remove-Variable sesSenderEmail, frontendOrigin
```

Review the generated change set and confirm the sender is verified in SES in `ap-southeast-2`. ADMIN membership must be granted by a trusted operator through Cognito; it is never accepted from user input. After deployment, configure the frontend with the stack's API and Cognito outputs.

## Local integration test plan and limits

Local checks cover Java service/handler behavior with mocked AWS clients, frontend service/component behavior with mocked authentication/API responses, TypeScript/Vite production compilation, and SAM template validation/build. They provide contract and code-level confidence, not a complete end-to-end run.

The following require deployed AWS resources to verify end to end: Cognito signup, email confirmation, login, token refresh, and API JWT validation; persistent event/registration/dashboard reads and writes in DynamoDB; SES acceptance and actual delivery/bounce feedback; and EventBridge schedule creation, updates, deletion, and reminder invocation. An ADMIN account also needs trusted Cognito group assignment. No AWS resources have been deployed as part of this repository work.

Known limitations include:

- `ACCEPTED_BY_SES` records SES acceptance, not confirmed recipient delivery. Delivery feedback is currently aggregate CloudWatch telemetry, not a per-notification record update.
- A cancelled registration uses a stable user/event identifier and cannot currently be reactivated through the API; registering again conflicts with the existing record.
- Scheduler expressions have whole-second precision; reminder timestamps are rounded up by less than one second, and reminders already in the past are skipped.
- Scheduler reconciliation is an ADMIN operation and must be exercised against live AWS to verify its real permissions and invocation behavior.
- Browser layout and interaction tests run in Vitest/jsdom; no deployed browser-to-AWS end-to-end session was performed.
