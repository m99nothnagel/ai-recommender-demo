# AI Recommender MVP (Static prototype)

Files:
- index.html
- style.css
- recommender.js
- data/tools.json

## Quick start (GitHub -> Vercel)
1. Create a public GitHub repo and upload these files (root).
2. Go to https://vercel.com -> Import Project -> pick the GitHub repo -> Deploy (static).
3. Vercel will publish a live URL in ~30-60 seconds.

## What the prototype does
- Login as Entrepreneur or Vendor (stored in localStorage)
- Home shows name, company, points and how to earn promo codes
- Tools list (from data/tools.json)
- Select page with interactive 5-leg radial (draggable points) + business function & filters
- Recommend returns top-3 tools with checklist and links
- Feedback stored in browser (localStorage) and updates points

Notes:
- This is for demo/prototype; feedback is stored only in the browser (client-side).
- To persist feedback across users/sessions you would need a server or database.
