/* ==========================================================================
   PHARAOH'S BITES — Content data
   Single source of truth for the menu, gallery and reviews.

   MENU ITEM FIELDS
     id       unique slug, used by the basket and favourites
     cat      must match a CATEGORIES id below: mains | desserts | sides
     name     English name shown on the card
     ar       Arabic name, shown beside it
     price    plain number, formatted by money() using NB_CONFIG.currency
     special  true  -> the pharaoh mark is shown beside the item
     desc     one or two sentences
     tags     rendered as pills; vegan/vegetarian turn green, special turns gold
     img      PLACEHOLDER photography. Swap these for the real photos.
   ========================================================================== */
(function (global) {
  "use strict";

  var U = "https://images.unsplash.com/photo-";
  var Q = "?auto=format&fit=crop&w=900&q=80";
  var QL = "?auto=format&fit=crop&w=1600&q=82";

  /* Categories -------------------------------------------------------- */
  var CATEGORIES = [
    { id: "mains",    name: "The Main Table", blurb: "Feteer stretched by hand, and the baked trays an Egyptian table is built around. Everything here is made to order." },
    { id: "soups",    name: "Soups",          blurb: "Simmered slowly and sent out hot in a sealed container." },
    { id: "desserts", name: "Sweet",          blurb: "Syrup, nuts, cream and chocolate. Cut to order and boxed while still warm." },
    { id: "sides",    name: "On the Side",    blurb: "What Egyptians actually put next to feteer — cheese, honey and tahini, nothing more complicated than that." },
    { id: "drinks",   name: "Drinks",         blurb: "Made to order and sealed for the journey." }
  ];

  /* Menu -------------------------------------------------------------- */
  var MENU = [

    /* ---------------- THE MAIN TABLE ---------------- */
    { id: "feteer-meshaltet", cat: "mains", name: "Feteer Meshaltet", ar: "فطير مشلتت",
      price: 14, special: true, featured: true,
      desc: "The original. Paper-thin dough stretched by hand, folded again and again with ghee between every layer, then baked until the top shatters.",
      tags: ["House Special", "Vegetarian"], img: U + "1787690376659-e5e7cd2ae452" + Q },

    { id: "feteer-beef", cat: "mains", name: "Feteer with Plant-Based Beef & Mozzarella", ar: "فطير محشي لحمة",
      price: 18, special: true, featured: true,
      desc: "The same hand-stretched layers, stuffed with seasoned plant-based ground beef and melted mozzarella, sealed and returned to the oven.",
      tags: ["House Special", "Plant-Based"], img: U + "1631875962715-e36c2d5189ca" + Q },

    { id: "macarona-bechamel", cat: "mains", name: "Macarona Béchamel Tray", ar: "صينية مكرونة بشاميل",
      price: 16, featured: true,
      desc: "Penne baked under a thick blanket of béchamel with plant-based ground beef through the middle, browned on top and cut into squares.",
      tags: ["Plant-Based", "Tray"], img: U + "1620041631703-45ddcef3dae0" + Q },

    { id: "goulash-beef", cat: "mains", name: "Goulash Tray with Plant-Based Beef", ar: "صينية جلاش باللحمة",
      price: 16,
      desc: "Sheet after sheet of thin pastry layered with spiced plant-based ground beef and onion, brushed with ghee and baked golden.",
      tags: ["Plant-Based", "Tray"], img: U + "1617806501736-fc7cab7c05bf" + Q },

    { id: "kofta-tray", cat: "mains", name: "Plant-Based Kofta Tray with Salsa & Rice", ar: "صينية كفتة بالصلصة والأرز",
      price: 35,
      desc: "Hand-shaped plant-based kofta baked in a rich tomato salsa with onion and garlic, served over a bed of Egyptian rice. Feeds a table.",
      tags: ["Plant-Based", "Tray"], img: U + "1763647818263-62a9256f097c" + Q },

    { id: "meatballs-spaghetti", cat: "mains", name: "Plant-Based Meatballs & Spaghetti", ar: "كرات لحم نباتية بالمكرونة",
      price: 25,
      desc: "Plant-based meatballs simmered in tomato sauce and tossed through spaghetti, finished with a little parmesan.",
      tags: ["Plant-Based"], img: U + "1622973536968-3ead9e780960" + Q },

    /* ---------------- SOUPS ---------------- */
    { id: "lentil-soup", cat: "soups", name: "Lentil Soup", ar: "شوربة عدس",
      price: 7,
      desc: "Red lentils cooked down with onion, carrot and cumin until smooth, finished with lemon. Comes with bread on the side.",
      tags: ["Vegan"], img: U + "1642497394078-4794e837019c" + Q },

    /* ---------------- SWEET ---------------- */
    { id: "goulash-nuts", cat: "desserts", name: "Goulash Tray with Nuts", ar: "صينية جلاش بالمكسرات",
      price: 15, special: true, featured: true,
      desc: "Layered pastry packed with walnut, almond and pistachio, baked crisp and soaked in syrup the moment it leaves the oven.",
      tags: ["House Special", "Contains Nuts"], img: U + "1594981449006-3bb015dd305a" + Q },

    { id: "mini-feteer-sweet", cat: "desserts", name: "Mini Feteer, Nutella or Pistachio", ar: "فطير صغير حلو",
      price: 11, featured: true,
      desc: "A palm-sized feteer with all its layers intact, finished with Nutella or pistachio sauce. Choose when you order.",
      tags: ["Vegetarian"], img: U + "1669630367800-b2c3ae70528e" + Q },

    { id: "round-cake", cat: "desserts", name: "Small Round Cake", ar: "كيكة صغيرة",
      price: 12,
      desc: "A small home-style cake, baked fresh and iced simply. Ask what today's is.",
      tags: ["Vegetarian"], img: U + "1602351447937-745cb720612f" + Q },

    { id: "chocolate-pudding", cat: "desserts", name: "Chocolate Pudding", ar: "بودينج شوكولاتة",
      price: 7,
      desc: "Set dark chocolate pudding, chilled, with cream folded through the top.",
      tags: ["Vegetarian"], img: U + "1673551494277-92204546b504" + Q },

    { id: "banana-pudding", cat: "desserts", name: "Banana Pudding", ar: "بودينج موز",
      price: 7,
      desc: "Layers of vanilla cream, banana and biscuit, left to soften overnight.",
      tags: ["Vegetarian"], img: U + "1639330842151-8a92eb332b2d" + Q },

    { id: "creme-caramel", cat: "desserts", name: "Crème Caramel Flan", ar: "كريم كراميل",
      price: 8,
      desc: "Baked custard turned out under its own caramel. Cold, wobbling, and gone in a minute.",
      tags: ["Vegetarian"], img: U + "1653988354010-39637252a2db" + Q },

    /* ---------------- ON THE SIDE ---------------- */
    { id: "white-cheese", cat: "sides", name: "Egyptian White Cheese", ar: "جبنة بيضاء",
      price: 6, special: true, featured: true,
      desc: "Salty, crumbling domiati — the thing every Egyptian reaches for the moment the feteer is torn open.",
      tags: ["House Special", "Vegetarian"], img: U + "1559561853-08451507cbe7" + Q },

    { id: "black-honey", cat: "sides", name: "Black Honey", ar: "عسل أسود",
      price: 5,
      desc: "Sugarcane molasses, dark and mineral. The oldest sweet in the country, and the right partner for plain feteer.",
      tags: ["Vegan"], img: U + "1779120708355-7a41581b4584" + Q },

    { id: "white-honey", cat: "sides", name: "White Honey", ar: "عسل أبيض",
      price: 5,
      desc: "Clear wildflower honey, poured cold over hot layers so it runs straight through.",
      tags: ["Vegetarian"], img: U + "1558642452-9d2a7deb7f62" + Q },

    { id: "tahini", cat: "sides", name: "Tahini", ar: "طحينة",
      price: 5,
      desc: "Stone-ground sesame, loosened with lemon. Best stirred into the black honey until the two go pale.",
      tags: ["Vegan"], img: U + "1747932984398-dd52d84886d6" + Q },

    /* ---------------- DRINKS ---------------- */
    { id: "protein-shake", cat: "drinks", name: "House Special Protein Shake", ar: "مشروب البروتين",
      price: 9, special: true, featured: true,
      desc: "Twenty-five grams of protein, blended thick and cold. Our own recipe — nothing about it tastes like a supplement.",
      tags: ["House Special", "25g Protein"], img: U + "1542444592-0d5997f202eb" + Q }
  ];

  /* Gallery ----------------------------------------------------------- */
  var GALLERY = [
    { cat: "Feteer",  title: "Layers, pulled apart hot",        img: U + "1759302307381-bdccf7b35e5d" + QL },
    { cat: "Kitchen", title: "Stretching the dough",            img: U + "1754394483922-4d3a10cc6187" + QL },
    { cat: "Sweet",   title: "Goulash with nuts",               img: U + "1640040520679-2ace58742f22" + QL },
    { cat: "Sweet",   title: "Mini feteer, Nutella or pistachio", img: U + "1669630367800-b2c3ae70528e" + QL },
    { cat: "Trays",   title: "Macarona béchamel",               img: U + "1620041631703-45ddcef3dae0" + QL },
    { cat: "Kitchen", title: "Hands that know the dough",       img: U + "1777315387799-eba7be5422b2" + QL },
    { cat: "Kitchen", title: "Out of the oven",                 img: U + "1777315388484-f999eb67d74c" + QL },
    { cat: "Sides",   title: "White cheese and honey",          img: U + "1777891257739-5d0f6531a508" + QL },
    { cat: "Sweet",   title: "Something cold to finish",        img: U + "1653988354010-39637252a2db" + QL },
    { cat: "Feteer",  title: "Golden, straight from the stone", img: U + "1787690376659-e5e7cd2ae452" + QL },
    { cat: "Sides",   title: "Honey, poured cold",              img: U + "1558642452-9d2a7deb7f62" + QL },
    { cat: "Trays",   title: "Cut into squares",                img: U + "1594981449006-3bb015dd305a" + QL }
  ];

  /* PLACEHOLDER reviews - invented, not real customers. Replace before launch. */
  var REVIEWS = [
    { name: "Yasmine F.", role: "Plano", stars: 5,
      text: "I have eaten feteer my whole life and I was not expecting this in Texas. It arrived still hot enough that the ghee ran when we pulled it apart. My mother asked who made it." },
    { name: "Mark Whitfield", role: "Uptown", stars: 5,
      text: "Ordered the béchamel tray for a Sunday lunch and there was nothing left twenty minutes later. It travels well and reheats even better." },
    { name: "Nour El-Deeb", role: "Ordered for a church event", stars: 5,
      text: "Forty people, half sweet and half savoury, and they walked me through the whole spread beforehand. Everything turned up on time and warm. I have already ordered again." },
    { name: "Dina M.", role: "Frisco", stars: 5,
      text: "The goulash with nuts is dangerous. I ordered one tray to try and put in a second order before we had finished the first." },
    { name: "Omar Sabry", role: "Deep Ellum", stars: 5,
      text: "Proper ghee, proper layers, none of the shortcuts. First time since I moved here that feteer has tasted like home rather than an imitation of it." },
    { name: "Claire Bennett", role: "Irving", stars: 5,
      text: "Easy to order, they confirmed everything on WhatsApp, and it arrived exactly when they said. The reheating notes in the box were a nice touch." }
  ];

  global.NB_DATA = { CATEGORIES: CATEGORIES, MENU: MENU, GALLERY: GALLERY, REVIEWS: REVIEWS };
})(window);
