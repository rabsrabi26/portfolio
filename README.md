# rabsrabi.com

Static portfolio site: plain HTML, CSS and JavaScript. No build step or third-party runtime dependencies.

## Preview locally

```bash
python3 -m http.server 8080      # run from the repository root, then open http://localhost:8080
```

(Open it through a server, not by double-clicking `index.html`, because the site uses root-relative paths such as `/assets/app.js`.)

## Upload to rabsrabi.com

The repository root is the site. Upload its **contents** (not the `.git` folder) so that `index.html` sits at the site root. Include the hidden files `.htaccess` and `_headers`.

| Your host | What to do |
|---|---|
| **cPanel / shared hosting** (Apache, LiteSpeed) | File Manager or FTP → `public_html/`. `.htaccess` already wires up the 404 page, caching and compression. Turn on free AutoSSL, then uncomment the HTTPS/www block in `.htaccess`. |
| **Cloudflare Pages / Netlify** | Drag the folder into a new project (or connect a Git repo). `404.html` is picked up automatically and `_headers` applies. Add `rabsrabi.com` as a custom domain. |
| **GitHub Pages** | Push to a repo, enable Pages, add `rabsrabi.com` as the custom domain. `404.html` is picked up automatically. |

## Edit your content

- **Text, jobs, projects:** `index.html`
- **Email address:** search for `islam.muhammed.rabiul@gmail.com` in `index.html` and `assets/app.js`
- **Colours and type:** shared with the other rabsrabi sites through the brand kit in `assets/brand/` (tokens and theme script). Do not edit those two files here; copy updates from <https://github.com/rabsrabi26/brand>. Page styles are in `assets/style.css`
- **Photo:** replace `assets/photo.jpg` (4:5 portrait, about 640×800). If it is missing, the page shows an "RI" monogram instead.
- **Social preview image:** `og-image.png` (1200×630)

## What's inside

- The rabsrabi brand: shared logo, colors, type, header and footer with the notes blog and the admin
- Auto / Light / Dark switch from the brand kit, remembered for all of .rabsrabi.com
- Animated network-graph hero (pauses off-screen, respects "reduce motion")
- Lab scheduler: a browser-side port of the uploaded `MIMO-Scheduling-Simulation-Reviewed-v2` package, including its log-distance/shadowing channel-rate model and five event-driven scheduler policies; 100 runs for `main.m`, 50 runs for the sensitivity study, mean ± 95% confidence intervals, service-class probability weights, α/β controls and an antenna allocation timeline
- Lab subnet calculator: IPv4 network, netmask, wildcard, broadcast, usable-host range and subnet splitting
- Searchable command palette (`Ctrl/⌘ + K` or `/`) with aliases for sections, skills, technologies, projects and actions
- Footer-only icon links for email, LinkedIn and GitHub
- Custom 404 page, SVG + PNG favicons, web manifest, Open Graph/Twitter tags, JSON-LD, sitemap and robots.txt
- Recruiter résumé-request form (opens a pre-filled email; no form data is stored)
- Direct link to the public MATLAB thesis-simulation repository
- No site-provided print or PDF-export control

## Simulation fidelity note

The Lab is based on the uploaded `MIMO-Scheduling-Simulation-Reviewed-v2` MATLAB package (`default_config.m`, `generate_users.m`, `calculate_channel.m`, `scheduler_simulate.m`, and `run_experiment.m`). Defaults mirror `main.m`: K=20, M=16, 100 runs and seed 20261115. The 50-run option matches `run_sensitivity.m`. Users are uniform by area in a 500 m cell; service classes use normalised probability weights (30/40/30 by default); workload ranges are 1–5, 2–8 and 5–15 ms. The channel model uses log-distance path loss plus log-normal shadowing, then maps SNR through Shannon spectral efficiency to a normalised user rate factor.

The five policies are Location + Service Priority, strict-priority Multilevel Queue, 2 ms preemptive Round Robin, 1 ms Proportional Fair with 10 ms exponential averaging, and Max C/I. Antennas are modelled as independent service servers and a user may occupy at most one server at a time. Metrics are waiting time, turnaround time, Jain fairness and server-time utilisation. Confidence intervals use the same 1.96 × sample-standard-deviation / square-root-of-runs normal approximation as `run_experiment.m`.

**Browser-port correction:** while translating the reviewed MATLAB event loop, a non-advancing idle-server case was identified: when no user has arrived yet, the MATLAB loop can repeatedly select the same idle antenna because its `busyUser` state remains free while other idle-server timestamps remain at zero. The browser port advances to the next arrival or active service event, then dispatches all available idle antennas. The intended scheduling model (parallel servers, exclusive per-user service, RR/PF quanta and policy-specific user selection) is preserved. The JavaScript PRNG is deterministic but does not reproduce MATLAB's exact `mt19937ar` stream, so individual results will differ.

This is a large-scale channel-aware multi-server scheduling abstraction, not a full physical-layer Massive MIMO simulator. It does not implement channel vectors, precoding/combining, antenna correlation, spatial multiplexing or multi-user interference. The `bandwidth_Hz` field is retained as configuration metadata; the current channel calculation derives SNR from the configured transmit and noise powers and does not directly multiply rates by bandwidth. The public GitHub repository link still points to the published repository; this Lab has been synchronised against the separately supplied reviewed-v2 ZIP and should not be described as a byte-for-byte execution of the public repository revision.

## Responsive layout updates

- Contact forms are equal-height cards at desktop widths, with matching intro blocks and aligned submit buttons; on narrow screens they stack naturally.
- Scheduler result cards adapt to the available width instead of using a fixed-width comparison table.
- The antenna timeline displays all antenna rows (including M=64); on narrow screens it scrolls horizontally inside the chart frame rather than causing page-wide overflow.
