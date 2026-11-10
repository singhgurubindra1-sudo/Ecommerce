# FOR ME Studios

A 3D storefront for the FOR ME Studios clothing brand. A colourful, normally scrolling page: a 3D logo cloth in the hero, a centred product grid, the studio story and contact.

## Run it

It is a static site with no build step. Serve the folder with any web server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Edit the products

Everything lives in `js/products.js`: name, category, price, colour and description. The current pieces and prices are placeholders. Add `image: 'assets/products/photo.jpg'` to a piece to show a real photo (portrait, about 8:11) instead of the drawn illustration. `CURRENCY` at the top sets the currency symbol.

## Files

- `index.html` – markup for the scenes, bag, product panel and menu
- `css/style.css` – all styling
- `js/main.js` – hero 3D cloth (three.js), product grid, bag
- `js/cards.js` – draws the placeholder product cards
- `js/vendor/` – three.js r170 (MIT)
- `assets/` – logo files

Checkout and the newsletter form are not connected to a backend yet.
