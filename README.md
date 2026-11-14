# Portfolio v2 (hacker theme)

Features: anatomy-plate theme (bone, teal and rose) with a THEME switch, sound effects (SOUND button), Snake and "Hack the terminal" games with a scoreboard each, visitor counter, guestbook, featured project (Teish Taka).

## Run
Do not double-click `index.html` (browsers block modules from files). Use VS Code "Live Server", or just push to GitHub and open the deployed site.

## Demo mode
Until you add Firebase keys, the counter, scoreboard and guestbook only save in the visitor's own browser.

## Turn on shared data (Firebase, free)
1. Go to console.firebase.google.com, create a project (turn off Analytics).
2. Build > Firestore Database > Create database (production mode, pick a nearby region).
3. Firestore > Rules tab > paste everything from `firestore.rules` > Publish.
4. Project settings (gear) > Your apps > Web (</>) > register app > copy the `firebaseConfig` values.
5. Paste `apiKey`, `authDomain`, `projectId`, `appId` into `firebase-config.js`.
6. Push to GitHub. Firebase web keys are meant to be public; the rules protect your data.

Note: the scoreboard runs in the visitor's browser, so determined people could fake a score. Fine for a fun game.

## Update the site
```bash
git add .
git commit -m "Update portfolio"
git push
```

## To do
- Add `resume.pdf`
- Replace Films/Writing placeholders and "editing software you use"
- Real LinkedIn link
- Add what Teish Taka is built with
