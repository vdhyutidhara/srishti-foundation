# Sristi Foundation management dashboard

A local, read-only reporting application based on the [requirements PDF](<Sristi Foundation Management Dashboard Requirements.docx.pdf>) and [product plan](SRISTI_FOUNDATION_APP_PLAN.md).

The app currently uses **348 entirely fictional demo beneficiaries** and deterministic projects, services, assessments and follow-ups. Every screen and exported file identifies the demo data. No figures are claimed to come from the production database.

## Run locally

Requires Node.js 22 or later.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The server binds locally. Frontend changes refresh through Vite; restart after backend changes.

For the built version:

```sh
npm run build
npm start
```

## Available workflows

- Dashboard with six traceable KPI cards, project reach, contextual service trends, session status and overdue follow-ups.
- Shared project, period, district, status, age, gender, support-needs and permitted worker filters. Custom periods use an inclusive start and exclusive end.
- Project views, beneficiary search, pagination, read-only profiles, goals, assessments, service histories and follow-ups.
- Guided report templates with approved project, district, gender, age, month or service-type breakdowns.
- Previewed **real XLSX and PDF downloads** for summaries, project reports, registers and individual profiles. Downloads contain all permitted report rows, rather than only the visible table page.
- Demo director, EIC project head, MTP coordinator and aggregate-only reporting officer. The backend enforces project, profile, search and export scope; reporting-officer views conservatively suppress small groups and complements.
- Data-connection page for fixed SQL Server catalog inspection when credentials and the optional driver are available.

Registered and active counts describe the fixed 30 October 2026 demo snapshot. New registrations and served beneficiaries use the selected period. People overdue counts distinct people with open overdue follow-ups. The May–October service trend is separate, labelled context. Project enrolments overlap and must not be added to calculate unique organizational reach. Unverified targets and live indicators are unavailable.

## Production database boundary

Access is fixed to **`sristi_foundation_tamilnadu`**. There is no source editing, migration, schema creation, arbitrary-SQL endpoint or production write operation. The browser never receives database credentials.

The supplied connection details are already stored in a private, Git-ignored local configuration with owner-only permissions. For a fresh checkout, to configure **catalog inspection only**, copy `.env.example` to `.env` and enter the privately supplied credentials. `.env` is ignored by Git. The Microsoft SQL Server Node driver, `mssql`, is optional so the demo runs offline. In a network-enabled environment, ensure it is installed:

```sh
npm install --include=optional
```

Restart, select the demo director, then use **Data connection → Check read-only connection**. This reads database context, visible objects, columns, relationships and permission indicators using fixed catalog SELECTs, TLS verification, read-only intent, a small pool and bounded timeouts. It returns no personal records or passwords.

Successful checks save catalog metadata, including declared keys, to the Git-ignored private/catalog.json file with owner-only access. No credentials or beneficiary rows are saved. This evidence can be used for field mapping without asking staff to paste query results.

Read-only intent is advisory. The database owner must verify effective SELECT-only permissions. Inspection reports detected write capabilities without changing grants or attempting a write. Catalog visibility can be partial; a successful inspection does not activate live reporting or certify field meanings.

**Live reporting remains blocked** until the schema is reachable and mapped, KPI definitions reconcile, and real user/project/field authorization is approved and implemented. Demo personas are an access-review tool, not production authentication. No real beneficiary data is loaded by this version.

During implementation, this managed workspace could not resolve external hosts or open sockets, including localhost. The host was verified against DBeaver's saved connection. The optional SQL driver was absent from the offline cache. Run the app in your terminal with normal local-network permissions.

## Verification

```sh
npm test
npm run build
npm run test:ui
```

Backend tests cover unique counts, date boundaries, reconciliation, project isolation, aggregate-only access, read-method restrictions, export completeness and spreadsheet string safety. Browser tests route through the same application handler in process, so they need no server socket or production database.

Playwright needs Chromium: install it with `npx playwright install chromium`, or set `SRISTI_TEST_CHROMIUM` to an existing Chromium executable. Browser launch may itself be restricted in a managed environment. Here, the build and 10 backend tests passed; browser tests were blocked before execution by macOS sandbox permissions.

## Repository structure

| Path                  | Responsibility                                                 |
| --------------------- | -------------------------------------------------------------- |
| `src/`                | React views, charts, dialogs, controls and responsive styles.  |
| `server/index.js`     | Local HTTP server and Vite development integration.            |
| `server/app.js`       | Routing, demo sessions, authorization and export endpoints.    |
| `server/analytics.js` | Shared filters, scopes, metrics, profiles and report datasets. |
| `server/demo-data.js` | Explicitly fictional source records.                           |
| `server/exports.js`   | ExcelJS XLSX and PDFKit PDF generation.                        |
| `server/database.js`  | Optional catalog inspection; no live reporting mapping.        |
| `tests/`              | Focused backend and browser checks.                            |

The frontend uses React and Vite; the backend uses Node's HTTP library. Demo sessions expire after 30 minutes and use opaque HttpOnly, SameSite cookies. Switching roles replaces the session. Access/export audit events go to server stdout without source-record content. Production identity integration, audit retention, privacy policy and live mapping remain deployment prerequisites.
