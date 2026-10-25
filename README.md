# Portfolio

Personal portfolio of Masnoon Abrar Siam (CSE student and short film director at Daffodil International University).

Live site: https://masnoon-abrar-siam--portfolio-01.vercel.app/

## Files

- `index.html`: all page content
- `style.css`: all styling (follows light or dark mode automatically)
- `resume.pdf`: the CV linked from the "Download CV" button (add your own file with this exact name)

## Featured project

The "Featured project" section at the top of `index.html` shows Teish Taka (https://teish-taka-zquj.vercel.app/). It links to the live address, so visitors always see the latest version after you redeploy. To feature a different project later, edit that block.

## Add a new code project

1. Open `index.html` and find the `CODE PROJECTS` comment.
2. Copy one `<article class="item">` block and paste it at the top of the list.
3. Change the title, the one-line tag (`meta`), the goal, what you built, what you practiced, and the source link.

Films and writing work the same way: copy an `<article class="item">` block inside that section.

## Preview locally

Open `index.html` in your browser. No build step is needed.

## Publish an update

```bash
git add .
git commit -m "Add new project"
git push
```

Vercel redeploys automatically after each push to `main`.

## Still to do

- Add a line about what Teish Taka is built with (see the TODO in the Featured section)
- Replace the placeholder text in Films and Writing
- Replace "Editing software you use" in Skills and tools
- Add your real LinkedIn profile link in Contact
- Add `resume.pdf`
- Link each code project to its own folder in the `c-projects` repo
