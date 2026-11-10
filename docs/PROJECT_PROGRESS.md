# PROJECT_PROGRESS.md

## AI-Driven Ocular & Cognitive Focus Monitoring Platform

This file is the shared status tracker for the three-account development
workflow. Update it whenever work is completed, changed, or blocked. Do
not mark an item complete unless it has been implemented and verified.

## 1. Team ownership

  -----------------------------------------------------------------------
  Workstream              Owner                   Responsibility
  ----------------------- ----------------------- -----------------------
  Architecture and        Account 1               Project architecture,
  contracts                                       shared documentation,
                                                  API/schema consistency

  Frontend                Account 2               Next.js UI, pages,
                                                  components, frontend
                                                  integration

  Backend and ML          Account 3               FastAPI, MongoDB, auth,
                                                  monitoring APIs, ML
                                                  integration

  Final integration       Account 1               Merge/review,
                                                  end-to-end testing,
                                                  deployment coordination
  -----------------------------------------------------------------------

## 2. Documentation status

The project owner reported that Claude Account 1 created these five
documents:

-   [x] `PROJECT_CONTEXT.md` --- reported created; content still needs
    review.
-   [x] `API_DOCUMENTATION.md` --- reported created; content still needs
    review.
-   [x] `DATABASE_SCHEMA.md` --- reported created; content still needs
    review.
-   [x] `PROJECT_STRUCTURE.md` --- reported created; content still needs
    review.
-   [x] `ML_INTEGRATION.md` --- reported created; content still needs
    review.
-   [ ] `UI_DESIGN_GUIDELINES.md` --- create/use this document.
-   [ ] `PROJECT_PROGRESS.md` --- use this tracker.

**Important:** The checkmarks above mean "reported created by Account
1", not independently verified by the integration lead. Review the
actual files before relying on their contents.

## 3. Initial project inspection

  -----------------------------------------------------------------------
  Task                    Status                  Notes
  ----------------------- ----------------------- -----------------------
  Inspect uploaded        Reported complete       Account 1 reported
  project ZIP                                     completing inspection

  Inspect frontend        Needs confirmation      Verify against actual
  structure                                       source files

  Inspect Python training Needs confirmation      Record actual features
  script                                          and pipeline

  Inspect trained vision  Needs confirmation      Confirm load method and
  model                                           expected input

  Inspect EEG CSV         Needs confirmation      Confirm columns, units,
                                                  sampling assumptions,
                                                  and simulated-data
                                                  status

  Verify calibration      In progress / needs     Account 1 indicated it
  behavior                confirmation            was checking EEG
                                                  calibration behavior

  Verify Next.js          In progress / needs     Use official
  routing/auth guidance   confirmation            documentation and the
                                                  installed Next.js
                                                  version
  -----------------------------------------------------------------------

## 4. Architecture and contracts

-   [ ] Confirm frontend stack from `package.json`.
-   [ ] Confirm FastAPI backend architecture.
-   [ ] Confirm MongoDB Atlas data model.
-   [ ] Confirm authentication and cookie/token strategy.
-   [ ] Confirm CORS and production origins.
-   [ ] Confirm exact API request/response contracts.
-   [ ] Confirm error response format.
-   [ ] Confirm monitoring transport and update frequency.
-   [ ] Confirm session lifecycle and ownership rules.
-   [ ] Confirm captured-moment payload and persistence behavior.
-   [ ] Confirm optional image-storage consent and retention behavior.
-   [ ] Confirm analytics calculations use stored data only.

## 5. Account 2 --- frontend

  Task                                               Status
  -------------------------------------------------- -------------
  Receive shared docs and original frontend source   Not started
  Landing page and design system                     Not started
  Login and signup pages                             Not started
  Authenticated dashboard                            Not started
  Monitoring interface                               Not started
  Capture Moment UI and API call                     Not started
  My Moments page                                    Not started
  Session history page                               Not started
  Analytics page                                     Not started
  Profile and privacy settings                       Not started
  Responsive and accessibility pass                  Not started
  Frontend build and smoke test                      Not started
  Handoff package and changed-file list              Not started

## 6. Account 3 --- backend and ML

  Task                                               Status
  -------------------------------------------------- -------------
  Receive shared docs and original ML/source files   Not started
  FastAPI app and configuration                      Not started
  MongoDB connection and indexes                     Not started
  Registration, login, logout, current-user APIs     Not started
  Password hashing and protected routes              Not started
  Monitoring session lifecycle APIs                  Not started
  Telemetry and image-analysis APIs                  Not started
  Existing vision model integration                  Not started
  EEG processing / simulated data labeling           Not started
  Fusion logic integration                           Not started
  Captured-moment create/list/detail/delete APIs     Not started
  Session history APIs                               Not started
  Analytics APIs                                     Not started
  Profile and account deletion APIs                  Not started
  Backend tests and deployment configuration         Not started
  Handoff package and changed-file list              Not started

## 7. Account 1 --- integration and review

  Task                                          Status
  --------------------------------------------- -------------
  Review all seven shared documents             Not started
  Provide handoff prompt to Account 2           Not started
  Provide handoff prompt to Account 3           Not started
  Review frontend deliverable                   Not started
  Review backend deliverable                    Not started
  Resolve API/schema mismatches                 Not started
  Integrate frontend and backend                Not started
  Verify per-user data isolation                Not started
  Verify Capture Moment survives logout/login   Not started
  Verify session history and analytics          Not started
  Run end-to-end tests                          Not started
  Prepare final README and deployment guide     Not started

## 8. Release acceptance checklist

Do not call the application complete until each applicable item is
verified:

-   [ ] Landing page loads and is responsive.
-   [ ] Registration creates a user with a securely hashed password.
-   [ ] Login and logout work.
-   [ ] Protected pages and APIs reject unauthenticated requests.
-   [ ] Users cannot read or modify another user's data.
-   [ ] Webcam access requires browser permission.
-   [ ] Monitoring starts and stops with a persisted session record.
-   [ ] Actual model output is used; no random/fabricated predictions.
-   [ ] Simulated EEG is explicitly labelled as simulated.
-   [ ] Capture Moment stores timestamp, session ID, and available
    telemetry in MongoDB.
-   [ ] Capture Moment reports success only after persistence succeeds.
-   [ ] Captured moments remain available after logout and login.
-   [ ] Optional image storage is consent-based.
-   [ ] History and analytics use actual stored records.
-   [ ] Empty, loading, and error states work.
-   [ ] Production frontend and backend communicate over HTTPS.
-   [ ] Environment variables and secrets are configured safely.
-   [ ] Deployment instructions are documented.
-   [ ] No critical build, runtime, or integration errors remain.

## 9. Known issues and decisions

Record issues in this format:

  -----------------------------------------------------------------------------------
  ID          Issue          Impact           Owner        Status      Resolution
  ----------- -------------- ---------------- ------------ ----------- --------------
  1           Google Fonts   Build may fail   Frontend     Open        Use
              unavailable in if font is                                local/system
              Claude sandbox fetched at build                          font fallback;
                             time                                      verify
                                                                       production
                                                                       build

  2           EEG            May affect       Backend/ML   Open        Inspect source
              calibration    interpretation                            and document
              behavior       of EEG metrics                            actual
              requires                                                 behavior
              verification                                             

  3           Actual EEG     Live EEG claims  Backend/ML   Open        Clearly label
              hardware       may be                                    CSV-based EEG
              availability   inaccurate                                as simulated
              not                                                      unless
              established                                              hardware is
                                                                       integrated
  -----------------------------------------------------------------------------------

Add new issues as they are discovered. Remove an issue only after its
resolution is verified.

## 10. Handoff rules

1.  Keep one master project directory/repository.
2.  Use separate branches or separate working copies for Account 2 and
    Account 3.
3.  Do not let both accounts edit the same files concurrently.
4.  Each account must provide a changed-file list, setup instructions,
    environment-variable list, and known issues.
5.  Merge only after reviewing the changes.
6.  Keep API names and data fields aligned with `API_DOCUMENTATION.md`
    and `DATABASE_SCHEMA.md`.
7.  If a contract must change, update the shared documentation and
    notify both teams.
8.  Never commit `.env` files, passwords, tokens, database credentials,
    or other secrets.

## 11. Update log

  -----------------------------------------------------------------------
  Date                    Owner                   Update
  ----------------------- ----------------------- -----------------------
  2026-11-09              Project owner /         Three-account workflow
                          planning                defined. Five
                                                  documentation files
                                                  reported created by
                                                  Account 1. UI
                                                  guidelines and progress
                                                  tracker prepared.

  -----------------------------------------------------------------------

------------------------------------------------------------------------

**Current overall status: Planning and documentation.** Frontend/backend
implementation and end-to-end integration have not yet been verified.
