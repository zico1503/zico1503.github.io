# Put Arcade Atlas online

Arcade Atlas is a static website. It has no server-side app or paid API to run. The bundled emulator, game, and core files are published with the site, so a Chromebook can open it in a browser over HTTPS.

## Free GitHub Pages address

GitHub Pages can host this site free for a public repository. Create a GitHub account if you do not already have one, then create a **public** repository.

- For an address like `https://YOUR-USERNAME.github.io/`, name the repository `YOUR-USERNAME.github.io`.
- For an address like `https://YOUR-USERNAME.github.io/arcade-atlas/`, name it `arcade-atlas` (or another project name).

Upload the **contents of this Arcade Atlas folder** to the repository root, including `.github/workflows/deploy.yml` and `.nojekyll`. Then:

1. Open the repository's **Settings → Pages**.
2. Set the publishing source to **GitHub Actions**.
3. Open the **Actions** tab and wait for “Deploy Arcade Atlas to GitHub Pages” to finish.
4. Open the page URL shown in the deployment summary. New pushes to `main` publish updates automatically.

GitHub Pages is public hosting. Anyone with the site address can visit it. Do not upload passwords, private files, or game files you are not authorized to distribute.

## Use a domain you own

The default `github.io` address is free. A custom domain such as `example.com` must be registered through a domain provider and may cost money each year.

After the site is published, enter your owned domain under **Settings → Pages → Custom domain**. Then add the DNS records GitHub specifies at your domain provider. For a subdomain such as `play.example.com`, GitHub Pages uses a `CNAME` record pointing to your `YOUR-USERNAME.github.io` address. For a root domain such as `example.com`, the provider needs supported apex records. Turn on **Enforce HTTPS** when GitHub makes it available. DNS updates can take time to spread.

Do not create a `CNAME` record for a domain you do not own. Follow GitHub's current [custom domain setup guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Chromebook notes

Open the published HTTPS address in Chrome. The site does not require an extension or Chromebook app. A school may block GitHub Pages or gaming sites; hosting does not override school network rules. Ask the school's administrator if the page is blocked.
