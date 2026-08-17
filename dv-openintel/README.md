# DV OpenIntel

DV OpenIntel is a lightweight, searchable OSINT resource directory built for researchers, journalists, security professionals, students and anyone working with legitimate open-source intelligence.

The interface is independent from Start.me and focuses on fast discovery: search, categories, favorites, dark/light theme and direct access to public resources.

## Features

- Instant search by tool name, domain or category
- Dynamic catalog loaded from the public OSINT4ALL GitHub dataset
- Category filters with resource counts
- Browser-local favorites using `localStorage`
- Dark and light themes
- Random-tool shortcut
- Responsive layout for desktop and mobile
- Automatic favicons by domain
- Progressive rendering for large result sets
- No backend, database or account required

## Run locally

You only need a static web server. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/dv-openintel/` from the repository root.

You can also copy the `dv-openintel` folder to any static host, GitHub Pages-compatible site or web server.

## How the catalog works

Instead of bundling a large frozen copy of the dataset, the browser fetches the public OSINT4ALL README from GitHub and parses Markdown headings and links into the searchable catalog. This keeps the project small and makes future upstream updates easier to consume.

If the upstream source is unavailable, the interface shows an error message instead of silently presenting stale results.

## Data source

Resource names, categories and external links are sourced from:

- `osint4all/osint4all.github.io`
- Upstream description: GitHub version of OSINT4ALL
- Upstream license: CC0-1.0

DV OpenIntel is not affiliated with OSINT4ALL, Start.me, Google or any linked third-party service.

## Privacy

Search and filtering run locally in the browser. Favorites and theme preference are stored locally using `localStorage`.

Favicons are requested from Google's favicon service when result cards are rendered. External tools have their own privacy policies and terms.

## Responsible use

This project is a directory of public links. Use OSINT only for lawful, authorized and ethical purposes. Respect privacy, applicable laws, platform terms and data-access restrictions. Inclusion of a resource is not an endorsement of every possible use of that resource.

## License

The DV OpenIntel interface code in this directory is released under the MIT License. The upstream OSINT4ALL dataset remains subject to its own CC0-1.0 license.

## Author

Created by Deivison Viana.

Website: `https://www.deivisonviana.com/`
