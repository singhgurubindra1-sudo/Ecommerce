// Placeholder catalogue. Replace names, prices and descriptions with the real ones.
// To use a real photo for a piece, add  image: 'assets/products/your-photo.jpg'
// (portrait, roughly 8:11) and it replaces the drawn illustration on the card.
// Real pieces use  images: [...]  (first one is the cover; the rest fill the gallery).

export const CURRENCY = '₹';

export const PRODUCTS = [
  { id: 'sunehri-lehenga', name: 'Sunehri Lehenga Set', cat: 'Lehenga Sets', price: 4999, tone: 'Marigold Yellow', badge: 'New',
    images: ['assets/products/sunehri-1.webp', 'assets/products/sunehri-2.webp', 'assets/products/sunehri-3.webp', 'assets/products/sunehri-4.webp', 'assets/products/sunehri-5.webp'],
    desc: 'A marigold two-piece made for haldi mornings. The cropped blouse is hand-embellished with pearls, mirror work and leaf embroidery, finished with a tassel hem and a lace-up back. The high-waisted skirt falls in deep, flowing pleats with a tasselled drawstring.' },
  { id: 'gulbahar-coord', name: 'Gulbahar Co-ord Set', cat: 'Co-ord Sets', price: 5499, tone: 'Ivory & Crimson', badge: 'New',
    images: ['assets/products/gulbahar-1.webp', 'assets/products/gulbahar-2.webp', 'assets/products/gulbahar-3.png', 'assets/products/gulbahar-4.png', 'assets/products/gulbahar-5.png'],
    desc: 'An ivory corset-style kurta with a sweetheart neckline, crimson piping and a lace-up back, worn over fitted flared trousers with crimson godet panels. Sheer bell sleeves and hems carry hand-embroidered crimson flowers with gold leaves, pearls and bead drops.' },
  { id: 'atelier-coat', name: 'The Atelier Coat', type: 'coat', cat: 'Outerwear', price: 6999, color: '#ffd23f', tone: 'Sunflower', bg: ['#ff5fa2', '#f02f7c'],
    desc: 'A long, double-faced wool coat with a soft shoulder and a clean lapel. Cut roomy enough for a knit underneath.' },
  { id: 'sunday-knit', name: 'Sunday Knit', type: 'knit', cat: 'Knitwear', price: 2999, color: '#fff1dc', tone: 'Cream', bg: ['#5cc8ff', '#2aa5ec'],
    desc: 'A relaxed crew-neck in brushed merino. Ribbed at the cuff and hem, with a slightly dropped shoulder.' },
  { id: 'signature-tee', name: 'Signature Tee', type: 'tee', cat: 'Essentials', price: 1299, color: '#0f2a3d', tone: 'Navy', bg: ['#ffdc5e', '#ffc021'],
    desc: 'Heavyweight organic cotton with a neat neckline that keeps its shape. The one you reach for first.' },
  { id: 'slip-dress', name: 'Silk Slip Dress', type: 'dress', cat: 'Dresses', price: 4499, color: '#ff5a4d', tone: 'Coral', bg: ['#1fcdbb', '#0c9c90'],
    desc: 'Bias-cut washed silk that skims without clinging. Fine straps, a gentle V and a hem that moves.' },
  { id: 'wide-trouser', name: 'Tailored Wide Trouser', type: 'trousers', cat: 'Trousers', price: 3499, color: '#1557c0', tone: 'Cobalt', bg: ['#ff9d57', '#ff7624'],
    desc: 'High-rise, full-length and pressed with a single crease. Wool blend with a little weight to it.' },
  { id: 'studio-shirt', name: 'Poplin Studio Shirt', type: 'shirt', cat: 'Shirting', price: 2499, color: '#fff6ec', tone: 'Chalk', bg: ['#4563ff', '#2538cf'],
    desc: 'Crisp cotton poplin with an easy, slightly oversized body. Wear it buttoned, open or half tucked.' },
  { id: 'midi-skirt', name: 'Pleated Midi Skirt', type: 'skirt', cat: 'Skirts', price: 2799, color: '#e0186f', tone: 'Magenta', bg: ['#cdf45a', '#a6d920'],
    desc: 'Soft knife pleats that fall from a flat waistband. Sits at the natural waist and ends mid-calf.' },
  { id: 'soft-blazer', name: 'Soft Blazer', type: 'blazer', cat: 'Tailoring', price: 5499, color: '#12b5a6', tone: 'Teal', bg: ['#ff7262', '#ee412c'],
    desc: 'Unlined and unstructured, so it wears like a cardigan and looks like tailoring. Single button.' },
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
