# Deployment

Two halves, deployed independently. The site has to work without the backend; the backend
must never be able to break the site. Everything below assumes you are in the repository
root.

---

## 1. Frontend — AWS Amplify Hosting

This is the part the challenge requires to be live, and it is genuinely a one-time setup.

### Before you start

- The repository must be on GitHub and public. Amplify can build private repos, but the
  submission requires a public link.
- The build must pass locally first:

  ```
  npm ci
  npm run verify
  ```

  If `verify` fails, Amplify will fail the same way. Fix it here, not in the console.

### Connect the repository

1. Open the [Amplify console](https://console.aws.amazon.com/amplify) and choose
   **Create new app → Host your web app**.
2. Authorise GitHub if prompted, then pick the repository and the `main` branch.
3. Amplify reads `amplify.yml` from the repository. Accept the detected settings — do not
   paste a different build spec. The file sets `npm ci`, `npm run build` and publishes
   `dist/`.
4. Under **Advanced settings → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | the API base URL from step 2 below, or omit entirely |

   Omitting it is fine: the site builds and the leaderboard degrades to offline.
5. **Save and deploy.** The first build takes roughly two minutes.

Amplify now watches `main`. Every push rebuilds, and the previous deployment keeps serving
until the new one is published, so a failed build never takes the site down.

### After the first successful deploy

1. Note the domain Amplify assigned, e.g. `https://main.d1234abcd.amplifyapp.com`.
2. Replace the placeholder canonical URL in `index.html`:

   ```html
   <link rel="canonical" href="https://YOUR-DOMAIN.amplifyapp.com/" />
   ```

3. Register that domain with GitHub / Coursera / wherever the submission form asks for it.
4. If you already deployed the backend, set `SiteOrigin` in `infra/template.yaml` to this
   exact origin (no trailing slash) and redeploy the stack so CORS matches. Then rebuild
   the frontend so the CSP `connect-src` includes the real API origin.

### Custom domain (optional)

**App settings → Domain management → Add domain.** Amplify issues a free ACM certificate
and creates the CDN entry. Nothing in the code changes except the canonical URL.

### Why there are no redirect rules

The site is a single document with `#anchor` navigation and no client-side router, so every
URL a visitor can reach is `index.html`. Amplify needs no SPA rewrite, and adding one would
only hide 404s for assets.

---

## 2. Backend — API Gateway, Lambda, DynamoDB (optional)

Nothing else on the page needs this. Deploy it if you want the live leaderboard; skip it and
the section honestly reports that it is offline.

### One command

Requires the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
and configured credentials.

```
cd infra
sam build
sam deploy --guided
```

Answers for `--guided`:

| Prompt | Answer |
|---|---|
| Stack name | `khizar-portfolio-leaderboard` |
| AWS Region | the region nearest you, e.g. `us-east-1` |
| Parameter `SiteOrigin` | your Amplify origin, e.g. `https://main.d1234abcd.amplifyapp.com` |
| Parameter `IpSalt` | press Enter for the generated default, or paste your own 16+ char secret |
| Parameter `ThrottlePerHour` | `5` |
| Confirm changeset | `y` |
| Allow SAM CLI IAM role creation | `y` |
| Save arguments to `samconfig.toml` | `y` (the file is gitignored) |

When it finishes, copy the `ApiUrl` output into `VITE_API_URL` (in `.env` locally, or in
the Amplify console for the deployed site) and rebuild. That is the whole integration.

### What gets created

| Resource | Why | Free-tier position |
|---|---|---|
| DynamoDB table, on-demand, TTL on `expiresAt` | leaderboard rows + hourly throttle counters | 25 GB storage and 25 WCU/RCU always free |
| Lambda, 256 MB, arm64, 5 s timeout | validation, rate limiting, ranking | 1M requests + 400,000 GB-s per month, always free |
| HTTP API, 2 routes | public JSON surface | 1M requests per month free for 12 months |
| CloudWatch Logs | error visibility | 5 GB ingest free |

At portfolio traffic (tens of requests a day) the running cost is **$0.00**. The only way
to spend money here is to leave a script hammering the endpoint, which is why stage-level
throttling is set at 10 requests/second with a burst of 20.

### Verify it works

```
curl https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/leaderboard
# {"entries":[]}

curl -X POST https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/runs \
  -H 'content-type: application/json' \
  -d '{"name":"test","isolationPercent":53.2,"removals":8,"sampleSize":380}'
# {"rank":1}
```

A submission with the wrong `sampleSize` must return `400`, and the sixth submission within
an hour must return `429`. Both are enforced in `infra/lambda/index.mjs`.

### Tear it down

```
sam delete --stack-name khizar-portfolio-leaderboard
```

Removes all four resources. The site keeps working; the leaderboard panel returns to its
offline state.

---

## 3. Troubleshooting

**Amplify build fails at `npm ci`.**
`package-lock.json` is out of sync with `package.json`. Run `npm install` locally, commit the
updated lockfile, push again.

**The page loads but the leaderboard says offline in production.**
Three usual causes, in order: `VITE_API_URL` was not set before the build; it was set with a
trailing slash (harmless) or to the wrong stage; or `SiteOrigin` in the stack does not match
the browser's origin exactly, so the browser blocks the response. Check the browser console
for a CORS message and re-deploy the stack with the right origin.

**Scores submit but never appear on the leaderboard.**
Check CloudWatch Logs for the function. The most common cause is a `sampleSize` mismatch —
`network.json` says how many nodes it contains, and the handler refuses anything else.

**Fonts or styles are missing after a deploy.**
The Content-Security-Policy in `index.html` is strict. If you add an external resource, the
policy has to change in the same commit, or the browser will block it silently.

**A route 403s instead of 404s.**
That is API Gateway doing its job: unknown paths have no route, so they never reach Lambda.
