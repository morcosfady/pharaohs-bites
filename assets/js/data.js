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
     suggest  optional category id. Adding this dish on the order page opens
              a prompt offering everything in that category as an add-on.
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
    { id: "sides",    name: "On the Side",    blurb: "What Egyptians actually put next to feteer — cheese, honey, tahini, baba ganoush and hummus." },
    { id: "drinks",   name: "Drinks",         blurb: "Made to order and sealed for the journey." }
  ];

  /* Menu -------------------------------------------------------------- */
  var MENU = [

    /* ---------------- THE MAIN TABLE ---------------- */
    { id: "feteer-meshaltet", cat: "mains", name: "Feteer Meshaltet", ar: "فطير مشلتت",
      price: 25, special: true, suggest: "sides",
      desc: "Flaky, buttery, pull-apart layers. Paper-thin dough stretched by hand, folded again and again with homemade butter between every layer, then baked until the top shatters.",
      tags: ["House Special", "Vegetarian"], img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },

    { id: "feteer-beef", cat: "mains", name: "Feteer with Plant-Based Beef & Mozzarella", ar: "فطير محشي لحمة",
      price: 40, special: true, featured: true,
      desc: "The same hand-stretched layers, stuffed with seasoned plant-based ground beef, melted mozzarella and a mix of vegetables — green pepper, olives and onions — then sealed and returned to the oven.",
      tags: ["House Special", "Plant-Based"], img: "assets/img/menu-real/feteer-beef-mozzarella.webp" },

    { id: "macarona-bechamel", cat: "mains", name: "Macarona Béchamel Tray", ar: "صينية مكرونة بشاميل",
      price: 30, featured: true,
      desc: "Tender penne layered with savory plant-based beef and creamy béchamel, baked until golden and served in hearty squares. Comes in a half-size foil tray.",
      tags: ["Plant-Based", "Tray"], img: "assets/img/menu-real/macarona-bechamel.webp" },

    { id: "goulash-beef", cat: "mains", name: "Goulash Tray with Plant-Based Beef", ar: "صينية جلاش باللحمة",
      price: 35,
      desc: "Crisp, golden layers of Egyptian goulash filled with seasoned plant-based ground beef, green peppers, onions, and olives. Cut into squares and served in a half-size foil tray.",
      tags: ["Plant-Based", "Tray"], img: "assets/img/menu-real/goulash-beef.webp" },

    { id: "kofta-tray", cat: "mains", name: "Plant-Based Kofta Tray with Salsa & Rice", ar: "صينية كفتة بالصلصة والأرز",
      price: 40,
      desc: "Seasoned plant-based kofta baked in a rich Egyptian tomato salsa and served in a half-size foil tray, with a separate tray of Egyptian rice with toasted vermicelli.",
      tags: ["Plant-Based", "Tray"], img: "assets/img/menu-real/kofta-tray.webp" },

    { id: "meatballs-spaghetti", cat: "mains", name: "Plant-Based Meatballs & Spaghetti", ar: "كرات لحم نباتية بالمكرونة",
      price: 30,
      desc: "Tender spaghetti tossed in a rich tomato sauce and topped with seasoned plant-based meatballs. Served in a half-size foil tray.",
      tags: ["Plant-Based"], img: "assets/img/menu-real/meatballs-spaghetti.webp" },

    /* ---------------- SOUPS ---------------- */
    { id: "lentil-soup", cat: "soups", name: "Lentil Soup", ar: "شوربة عدس",
      price: 7,
      desc: "Warm, velvety Egyptian creamy lentil soup, gently seasoned and served in a generous paper bowl.",
      tags: ["Vegan"], img: "assets/img/menu-real/lentil-soup.webp" },

    /* ---------------- SWEET ---------------- */
    { id: "goulash-nuts", cat: "desserts", name: "Goulash Tray with Nuts", ar: "صينية جلاش بالمكسرات",
      price: 25, special: true, featured: true,
      desc: "Crisp, golden layers of sweet Egyptian goulash filled with mixed nuts and finished with a light syrup glaze. Cut into squares and served in a half-size foil tray.",
      tags: ["House Special", "Contains Nuts"], img: "assets/img/menu-real/goulash-nuts.webp" },

    { id: "round-cake", cat: "desserts", name: "Small Round Cake", ar: "كيكة صغيرة",
      price: 13,
      desc: "A small, freshly baked plain cake with a golden crust and soft, fluffy crumb.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/round-cake.webp" },

    { id: "chocolate-pudding", cat: "desserts", name: "Chocolate Pudding", ar: "بودينج شوكولاتة",
      price: 7,
      desc: "Smooth, rich chocolate pudding served chilled in a small dessert cup.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/chocolate-pudding.webp" },

    { id: "banana-pudding", cat: "desserts", name: "Banana Pudding", ar: "بودينج موز",
      price: 7,
      desc: "Smooth, creamy banana pudding served chilled in a small dessert cup.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/banana-pudding.webp" },

    { id: "creme-caramel", cat: "desserts", name: "Crème Caramel Flan", ar: "كريم كراميل",
      price: 8,
      desc: "Baked custard turned out under its own caramel. Cold, wobbling, and gone in a minute.",
      tags: ["Vegetarian"], img: U + "1653988354010-39637252a2db" + Q },

    /* ---------------- ON THE SIDE ---------------- */
    { id: "white-cheese", cat: "sides", name: "Egyptian White Cheese", ar: "جبنة بيضاء",
      price: 2.99, special: true, featured: true,
      desc: "Salty, crumbling domiati — the thing every Egyptian reaches for the moment the feteer is torn open.",
      tags: ["House Special", "Vegetarian"], img: U + "1559561853-08451507cbe7" + Q },

    { id: "black-honey", cat: "sides", name: "Black Honey", ar: "عسل أسود",
      price: 2.49,
      desc: "Sugarcane molasses, dark and mineral. The oldest sweet in the country, and the right partner for plain feteer.",
      tags: ["Vegan"], img: U + "1779120708355-7a41581b4584" + Q },

    { id: "white-honey", cat: "sides", name: "White Honey", ar: "عسل أبيض",
      price: 2.49,
      desc: "Clear wildflower honey, poured cold over hot layers so it runs straight through.",
      tags: ["Vegetarian"], img: U + "1558642452-9d2a7deb7f62" + Q },

    { id: "tahini", cat: "sides", name: "Tahini", ar: "طحينة",
      price: 2.49,
      desc: "Stone-ground sesame, loosened with lemon. Best stirred into the black honey until the two go pale.",
      tags: ["Vegan"], img: U + "1747932984398-dd52d84886d6" + Q },

    { id: "baba-ganoush", cat: "sides", name: "Baba Ganoush", ar: "بابا غنوج",
      price: 5,
      desc: "Smoky roasted eggplant, blended smooth with tahini, garlic and lemon.",
      tags: ["Vegan"], img: "https://images.pexels.com/photos/14774982/pexels-photo-14774982.jpeg?auto=compress&cs=tinysrgb&w=900" },

    { id: "hummus", cat: "sides", name: "Hummus", ar: "حمص",
      price: 2,
      desc: "Chickpeas blended smooth with tahini, lemon and garlic, finished with olive oil.",
      tags: ["Vegan"], img: "https://images.pexels.com/photos/6327663/pexels-photo-6327663.jpeg?auto=compress&cs=tinysrgb&w=900" },

    /* ---------------- DRINKS ---------------- */
    { id: "protein-shake", cat: "drinks", name: "House Special Protein Shake", ar: "مشروب البروتين",
      price: 12, special: true, featured: true,
      desc: "Twenty-five grams of protein, blended thick and cold. Our own recipe — nothing about it tastes like a supplement.",
      tags: ["House Special", "25g Protein"], img: U + "1542444592-0d5997f202eb" + Q },

    { id: "avocado-drink", cat: "drinks", name: "Avocado Shake with Nuts", ar: "عصير أفوكادو بالمكسرات",
      price: 8,
      desc: "Ripe avocado blended with cold milk until it's thick and smooth, topped with crushed nuts.",
      tags: ["Vegetarian", "Contains Nuts"], img: U + "1693042442021-41423615ce89" + Q }
  ];

  /* Gallery ----------------------------------------------------------- */
  var GALLERY = [
    { cat: "Feteer",  title: "Layers, pulled apart hot",        img: "assets/img/menu-real/feteer-meshaltet-square.jpg" },
    { cat: "Kitchen", title: "Stretching the dough",            img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },
    { cat: "Sweet",   title: "Goulash with nuts",               img: U + "1640040520679-2ace58742f22" + QL },
    { cat: "Trays",   title: "Macarona béchamel",               img: "assets/img/menu-real/macarona-bechamel.webp" },
    { cat: "Kitchen", title: "Hands that know the dough",       img: U + "1777315387799-eba7be5422b2" + QL },
    { cat: "Kitchen", title: "Out of the oven",                 img: U + "1777315388484-f999eb67d74c" + QL },
    { cat: "Sides",   title: "White cheese and honey",          img: U + "1777891257739-5d0f6531a508" + QL },
    { cat: "Sweet",   title: "Something cold to finish",        img: U + "1653988354010-39637252a2db" + QL },
    { cat: "Feteer",  title: "Golden, straight from the stone", img: U + "1787690376659-e5e7cd2ae452" + QL },
    { cat: "Sides",   title: "Honey, poured cold",              img: U + "1558642452-9d2a7deb7f62" + QL },
    { cat: "Trays",   title: "Cut into squares",                img: "assets/img/menu-real/goulash-nuts.webp" }
  ];

  /* PLACEHOLDER reviews - invented, not real customers. Replace before launch. */
  var REVIEWS = [
    { name: "Yasmine F.", role: "Plano", stars: 5,
      text: "I have eaten feteer my whole life and I was not expecting this in Texas. It arrived still hot enough that the butter ran when we pulled it apart. My mother asked who made it." },
    { name: "Mark Whitfield", role: "Uptown", stars: 5,
      text: "Ordered the béchamel tray for a Sunday lunch and there was nothing left twenty minutes later. It travels well and reheats even better." },
    { name: "Nour El-Deeb", role: "Ordered for a church event", stars: 5,
      text: "Forty people, half sweet and half savoury, and they walked me through the whole spread beforehand. Everything turned up on time and warm. I have already ordered again." },
    { name: "Dina M.", role: "Frisco", stars: 5,
      text: "The goulash with nuts is dangerous. I ordered one tray to try and put in a second order before we had finished the first." },
    { name: "Omar Sabry", role: "Deep Ellum", stars: 5,
      text: "Proper butter, proper layers, none of the shortcuts. First time since I moved here that feteer has tasted like home rather than an imitation of it." },
    { name: "Claire Bennett", role: "Irving", stars: 5,
      text: "Easy to order, they confirmed everything on WhatsApp, and it arrived exactly when they said. The reheating notes in the box were a nice touch." }
  ];

  global.NB_DATA = { CATEGORIES: CATEGORIES, MENU: MENU, GALLERY: GALLERY, REVIEWS: REVIEWS };
})(window);
