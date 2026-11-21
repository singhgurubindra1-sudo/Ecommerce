# FOR ME Studios

A 3D storefront for the FOR ME Studios clothing brand. A colourful, normally scrolling page: a 3D logo cloth in the hero, a centred product grid, the studio story, feedback and contact. Each product opens on its own page at `#product-id`.

## Run it

The site now runs on a small Node.js server (Node 20.12 or newer), which also handles online payments.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Razorpay keys (Razorpay Dashboard → Account & Settings → API Keys):

   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

   `.env` is in `.gitignore` and must never be committed. On a hosting service, set these two as environment variables instead.

3. Start the server:

   ```bash
   npm start
   ```

   Then open http://localhost:8000 (set `PORT` to change it).

`python3 -m http.server` still shows the site, but online payment will not work there because it has no backend.

## Payments (Razorpay Standard Checkout)

- `POST /api/create-order` takes `{ items: [{ id, qty }] }`, prices them from `js/products.js` on the server, and creates a Razorpay order. The browser never decides the amount.
- The checkout page opens the Razorpay window with that order.
- `POST /api/verify-payment` checks the `razorpay_signature` with HMAC-SHA256 of `order_id|payment_id` using the key secret. The order is only confirmed if it matches.
- Cash on Delivery still works without the payment server.

Test mode: with `rzp_test_` keys, use Razorpay's test cards or UPI ID `success@razorpay` to complete a payment. No real money moves.

## Edit the products

Everything lives in `js/products.js`: name, category, price, colour and description. Add `image: 'assets/products/photo.jpg'` to a piece to show a real photo (portrait, about 8:11) instead of the drawn illustration. `CURRENCY` at the top sets the currency symbol.

## Files

- `index.html` – markup for the scenes, bag, product panel and menu
- `css/style.css` – all styling
- `server.js` – Node server: serves the site and the Razorpay order and verification endpoints
- `js/main.js` – product grid, cart, wishlist, feedback, support, checkout (Razorpay or Cash on Delivery)
- `js/india.js` – states and cities for the checkout dropdowns
- `js/hero.js` – hero 3D cloth (three.js)
- `js/cards.js` – draws the placeholder product cards
- `js/vendor/` – three.js r170 (MIT)
- `assets/` – logo files

Prices are in INR. The cart, wishlist, feedback, support tickets and placed orders are saved only in the visitor's own browser (localStorage). Nothing is sent to a server yet, so orders do not reach the shop until a backend is connected.
