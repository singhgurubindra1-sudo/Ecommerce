// Product catalogue. Add a new piece by copying one of the entries below.
// To use a real photo for a piece, add  image: 'assets/products/your-photo.jpg'
// (portrait, roughly 8:11) and it replaces the drawn illustration on the card.
// Real pieces use  images: [...]  (first one is the cover; the rest fill the gallery).

// price is what the customer pays. mrp is the list price shown struck through;
// the "% off" label is worked out from the two. Leave mrp out to show no discount.

export const CURRENCY = '₹';

export const PRODUCTS = [
  { id: 'sunehri-lehenga', name: 'Sunehri Lehenga Set', cat: 'Lehenga Sets', price: 4999, mrp: 9099, tone: 'Marigold Yellow',
    images: ['assets/products/sunehri-1.webp', 'assets/products/sunehri-2.webp', 'assets/products/sunehri-3.webp', 'assets/products/sunehri-4.webp', 'assets/products/sunehri-5.webp'],
    desc: 'Sunshine you can wear. A richly embroidered marigold blouse and a sweeping, high-waisted skirt, made for haldi mornings, mehendi afternoons and every celebration in between.',
    story: [
      'Sunehri means golden, and this set lives up to its name. The cropped blouse is covered edge to edge in embroidery: leaf-and-vine thread work, pearl-centred flowers, shimmering sequins and crystal stones with a kundan look, all worked by hand and machine until the whole bodice catches the light.',
      'Wide embroidered straps frame the neckline, and a beaded border runs along the hem, dropping into a row of pearl hangings and thread tassels that sway as you move. Turn around and the back is just as considered: a criss-cross lace-up between two embroidered panels, tied with matching tassels so you can adjust the fit exactly as you like it.',
      'The skirt sits high on the waist on a clean, flat waistband, then opens through structured box pleats into a full, floor-sweeping flare. It is cut in a fluid georgette that feels light on the body and moves beautifully in every twirl, with a tasselled drawstring as the finishing touch.',
    ],
    details: [
      'Cropped blouse with wide embroidered shoulder straps',
      'Leaf and vine thread embroidery with pearl-centred floral motifs',
      'Sequin, pearl bead and crystal stone work with a kundan look',
      'Beaded border with pearl hangings and thread tassels along the hem',
      'Lace-up back with tasselled dori for an adjustable fit',
      'High-waist skirt with flat waistband and structured box pleats',
      'Full flare with a tasselled waist drawstring',
      'Fully lined blouse and skirt',
    ],
    fabric: [
      ['Blouse and straps', 'Crepe and silk-blend base, sturdy enough to carry heavy embroidery, beads and stone work'],
      ['Skirt', 'Fluid silk georgette for a lightweight, flowy drape with volume'],
      ['Blouse lining', 'Soft cotton satin for comfort and breathability'],
      ['Skirt lining', 'Smooth crepe and satin lining for opacity and an even fall'],
    ] },
  { id: 'gulbahar-coord', name: 'Gulbahar Co-ord Set', cat: 'Co-ord Sets', price: 5499, mrp: 8749, tone: 'Ivory & Burgundy',
    images: ['assets/products/gulbahar-1.webp', 'assets/products/gulbahar-2.webp', 'assets/products/gulbahar-3.png', 'assets/products/gulbahar-4.png', 'assets/products/gulbahar-5.png'],
    desc: 'A garden in full bloom, stitched in thread. An ivory corset-style kurta with dramatic sheer bell sleeves and flared trousers, traced all over with burgundy flowers, gold leaves and pearls.',
    story: [
      'Gulbahar is built around contrast: soft ivory against deep burgundy. The structured bodice has a sweetheart neckline outlined in burgundy piping with a small keyhole at the centre, and it is shaped through the waist before falling into a panel with side slits. Each slit opens onto a burgundy inner panel finished with a dori tassel.',
      'The sleeves are the showstopper. Cut in layers of sheer organza, they fall into wide bells edged with beadwork and contrast piping, with tiny bead drops along the hem that move with every gesture. At the back, a burgundy lace-up runs down the bodice and ends in a pair of tassels.',
      'The embroidery is worked flower by flower: burgundy and dusty rose blossoms in fine thread, gold zari leaves and vines, pearl beads and gold-tone sequins scattered between them. It climbs the bodice, trails down the sleeves and gathers at the hem of the trousers.',
      'The trousers fit close through the hip and flare from the knee into a sweeping hem. A front slit reveals a burgundy contrast panel with a string of pearls down the centre, and the hem is finished in a soft scallop.',
    ],
    details: [
      'Sweetheart neckline with burgundy contrast piping and a centre keyhole',
      'Structured corset-style bodice with side slits and burgundy inner panels',
      'Lace-up back finished with burgundy tassels',
      'Layered sheer bell sleeves with beadwork, piping and bead drops',
      'All-over floral thread embroidery in burgundy and dusty rose',
      'Gold zari leaves, pearl beads and gold-tone sequins',
      'Flared trousers with a front slit, burgundy contrast panel and pearl string',
      'Scalloped, embroidered hem',
      'Fully lined bodice and trousers',
    ],
    fabric: [
      ['Bodice and panel', 'Premium silk blend: structured, smooth and made to hold embroidery'],
      ['Sleeves', 'Soft organza for a light, sheer and flowing drape'],
      ['Trousers', 'Matte crepe with a clean fall and an elegant flare'],
      ['Contrast panels and piping', 'Burgundy satin for a rich finish'],
      ['Lining', 'Soft cotton lining in the bodice and trousers for comfort and coverage'],
    ] },
  { id: 'noor-crossover-top', name: 'Noor Crossover Top', cat: 'Tops', price: 1199, mrp: 1849, tone: 'Black',
    images: ['assets/products/noor-1.webp', 'assets/products/noor-2.webp'],
    desc: 'The black top that does the talking. A fitted, cropped long-sleeve with a crossover halter neckline at the front and an open cut-out at the back.',
    story: [
      'From the front, two panels cross at the collarbone and wrap up into a high neck, leaving a neat cut-out at each shoulder. It reads sleek and sculpted without showing more than you want it to.',
      'Turn around and the high collar frames a wide, open back above a clean straight band. Full-length sleeves and a cropped hem keep the shape long and close to the body, so it sits just as well with high-waisted trousers and skirts as it does with denim.',
    ],
    details: [
      'Crossover halter-style neckline with a high neck',
      'Cut-out detail at each shoulder',
      'Open back cut-out below a high collar',
      'Full-length fitted sleeves',
      'Cropped length with soft gathering at the waist',
      'Close, body-skimming fit',
    ],
    fabric: [
      ['Main body', 'Premium nylon-spandex jersey, 220–240 GSM'],
    ] },
];

// Coupon codes. percent is taken off the order subtotal; one code per order.
// firstOrder: true limits a code to shoppers who have not ordered before.
// strip is the line that runs in the yellow strip, title and note show in the cart.
export const COUPONS = [
  { code: 'FORME10', percent: 10, firstOrder: true, strip: '10% off your first purchase', title: 'First purchase', note: '10% off your first order' },
  { code: 'WINTER5', percent: 5, strip: 'Winter deal · 5% off everything', title: 'Winter deal', note: '5% off everything this winter' },
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
