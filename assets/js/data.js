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
    { id: "combos",   name: "Combos",         blurb: "Bundled together and priced to save." },
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
      price: 25, special: true, hero: true, suggest: "sides",
      desc: "Flaky, buttery, pull-apart layers. Paper-thin dough stretched by hand, folded again and again with homemade butter between every layer, then baked until the top shatters.",
      tags: ["House Special", "Vegetarian"], img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },

    { id: "feteer-beef", cat: "mains", signature: true, name: "Feteer with Plant-Based Beef & Mozzarella", ar: "فطير محشي لحمة",
      price: 40, special: true, featured: true,
      desc: "The same hand-stretched layers, stuffed with seasoned plant-based ground beef, melted mozzarella and a mix of vegetables — green pepper, olives and onions — then sealed and returned to the oven.",
      tags: ["House Special", "Plant-Based"], img: "assets/img/menu-real/feteer-beef-mozzarella.webp" },

    { id: "macarona-bechamel", cat: "mains", signature: true, name: "Macarona Béchamel Tray", ar: "صينية مكرونة بشاميل",
      price: 35, featured: true,
      desc: "Tender penne layered with savory plant-based beef and creamy béchamel, baked until golden and served in hearty squares. Comes in a half-size foil tray.",
      tags: ["Plant-Based", "Tray"], img: "assets/img/menu-real/macarona-bechamel.webp" },

    { id: "goulash-beef", cat: "mains", signature: true, name: "Goulash Tray with Plant-Based Beef", ar: "صينية جلاش باللحمة",
      price: 35,
      desc: "Crisp, golden layers of Egyptian goulash filled with seasoned plant-based ground beef, green peppers, onions, and olives. Cut into squares and served in a half-size foil tray.",
      tags: ["Plant-Based", "Tray"], img: "assets/img/menu-real/goulash-beef.webp?v=2" },

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

    { id: "orzo-soup", cat: "soups", name: "Egyptian Orzo Soup", ar: "لسان العصفور",
      price: 7,
      desc: "Tender toasted orzo pasta simmered in a warm, savory broth, Egyptian comfort in every spoonful.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/orzo-soup.webp" },

    /* ---------------- SWEET ---------------- */
    { id: "om-ali", cat: "desserts", signature: true, name: "Om Ali", ar: "أم علي",
      price: 25, special: true, featured: true,
      desc: "Warm Egyptian Om Ali with flaky pastry baked in sweet, creamy milk, finished with a golden top and mixed nuts. Served in a half-size foil tray.",
      tags: ["House Special", "Contains Nuts", "Tray"], img: "assets/img/menu-real/om-ali.webp" },

    { id: "goulash-nuts", cat: "desserts", signature: true, name: "Goulash Tray with Nuts", ar: "صينية جلاش بالمكسرات",
      price: 25, special: true, featured: true,
      desc: "Crisp, golden layers of sweet Egyptian goulash filled with mixed nuts and finished with a light syrup glaze. Cut into squares and served in a half-size foil tray.",
      tags: ["House Special", "Contains Nuts"], img: "assets/img/menu-real/goulash-nuts.webp" },

    { id: "round-cake", cat: "desserts", name: "Small Round Cake", ar: "كيكة صغيرة",
      price: 10,
      desc: "A small, freshly baked plain cake with a golden crust and soft, fluffy crumb.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/round-cake.webp" },

    { id: "chocolate-pudding", cat: "desserts", name: "Chocolate Pudding", ar: "بودينج شوكولاتة",
      price: 5,
      desc: "Smooth, rich chocolate pudding served chilled in a small dessert cup.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/chocolate-pudding.webp" },

    { id: "banana-pudding", cat: "desserts", name: "Banana Pudding", ar: "بودينج موز",
      price: 5,
      desc: "Smooth, creamy banana pudding served chilled in a small dessert cup.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/banana-pudding.webp" },

    { id: "rice-pudding", cat: "desserts", signature: true, name: "Rice Pudding", ar: "رز باللبن",
      price: 6,
      desc: "Creamy Egyptian rice pudding topped with mixed nuts (optional), served chilled in a small dessert cup.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/rice-pudding.webp" },

    { id: "creme-caramel", cat: "desserts", name: "Crème Caramel Flan", ar: "كريم كراميل",
      price: 5,
      desc: "Silky crème caramel custard topped with golden caramel sauce, served chilled in a small dessert cup.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/creme-caramel.webp" },

    /* ---------------- ON THE SIDE ---------------- */
    { id: "white-cheese", cat: "sides", name: "Egyptian White Cheese", ar: "جبنة بيضاء",
      price: 4, special: true, featured: true,
      desc: "Homemade Egyptian white cheese.",
      tags: ["House Special", "Vegetarian"], img: "assets/img/menu-real/white-cheese.webp" },

    { id: "black-honey", cat: "sides", name: "Black Honey", ar: "عسل أسود",
      price: 3.5,
      desc: "Rich Egyptian sugarcane molasses with a deep, bold sweetness.",
      tags: ["Vegan"], img: "assets/img/menu-real/black-honey.webp" },

    { id: "white-honey", cat: "sides", name: "White Honey", ar: "عسل أبيض",
      price: 4,
      desc: "Golden bee honey with a smooth, natural sweetness.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/white-honey.webp" },

    { id: "tahini", cat: "sides", name: "Tahini", ar: "طحينة",
      price: 3,
      desc: "Smooth, creamy sesame paste with a rich, nutty flavor.",
      tags: ["Vegan"], img: "assets/img/menu-real/tahini.webp" },

    { id: "baba-ganoush", cat: "sides", name: "Baba Ganoush", ar: "بابا غنوج",
      price: 4,
      desc: "Smoky Egyptian baba ganoush made with roasted eggplant and tahini, served in a small cup.",
      tags: ["Vegan"], img: "assets/img/menu-real/baba-ganoush.webp" },

    { id: "hummus", cat: "sides", name: "Hummus", ar: "حمص",
      price: 4,
      desc: "Creamy hummus, a blend of chickpeas and tahini, served in a small cup.",
      tags: ["Vegan"], img: "assets/img/menu-real/hummus.webp" },

    /* ---------------- DRINKS ---------------- */
    { id: "protein-shake", cat: "drinks", name: "Special Chocolate Protein Shake", ar: "مشروب البروتين بالشوكولاتة",
      price: 9, special: true, featured: true,
      desc: "A rich, creamy chocolate 22g protein shake blended smooth and served chilled.",
      tags: ["House Special", "22g Protein"], img: "assets/img/menu-real/protein-shake.webp" },

    { id: "avocado-drink", cat: "drinks", name: "Avocado Drink", ar: "عصير أفوكادو",
      price: 8,
      desc: "Creamy avocado blended with milk and white honey for a smooth, naturally sweet drink.",
      tags: ["Vegetarian"], img: "assets/img/menu-real/avocado-drink.webp" },

    /* Photo: "Diet-Coke-Can.jpg" by Evan-Amos, public domain (Wikimedia Commons). */
    { id: "diet-coke", cat: "drinks", name: "Diet Coke 12 oz", ar: "دايت كوكاكولا",
      price: 2.5,
      desc: "Ice-cold Diet Coke, a classic 12 oz can. The perfect partner for feteer and trays.",
      tags: ["Cold"], img: "assets/img/menu-real/diet-coke.webp" },

    /* ---------------- COMBOS ----------------
       Listed best profit first. `includes` = the fixed contents (shown as photos); `slots` = what the customer
       picks (the order page opens a picker; the server checks the picks against the combo_slots table);
       `worth` = what the cheapest possible picks cost separately, for the "You save" badge. */
    { id: "party-tray", cat: "combos", name: "Party Tray", ar: "صينية الحفلة",
      price: 89.5, worth: 99,
      includes: ["feteer-meshaltet", "feteer-dip-trio"],
      slots: [{ key: "main", label: "Main", count: 1, options: ["macarona-bechamel", "kofta-tray"] },
              { key: "puddings", label: "Puddings", count: 4, options: ["banana-pudding", "chocolate-pudding", "creme-caramel", "rice-pudding"] }],
      desc: "Feteer Meshaltet, one main (Macarona Béchamel or Kofta Tray), the full Sides Platter and four puddings of your choice.",
      tags: ["Combo", "Best value"], img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },

    { id: "family-feast", cat: "combos", name: "Family Feast", ar: "عزومة العيلة",
      price: 69, worth: 76.5,
      includes: ["feteer-meshaltet"],
      slots: [{ key: "main", label: "Main", count: 1, options: ["macarona-bechamel", "kofta-tray"] },
              { key: "sides", label: "Sides", count: 2, distinct: true, options: ["white-cheese", "black-honey", "white-honey", "tahini", "baba-ganoush", "hummus"] },
              { key: "puddings", label: "Puddings", count: 2, options: ["banana-pudding", "chocolate-pudding", "creme-caramel", "rice-pudding"] }],
      desc: "Feteer Meshaltet, plus one main (Macarona Béchamel or Kofta Tray), two sides and two puddings of your choice.",
      tags: ["Combo", "Best value"], img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },

    { id: "egyptian-breakfast", cat: "combos", name: "Egyptian Breakfast", ar: "فطار مصري",
      price: 39.5, worth: 43.5,
      includes: ["feteer-meshaltet", "white-cheese", "black-honey", "tahini"],
      slots: [{ key: "shake", label: "Shake", count: 1, options: ["protein-shake", "avocado-drink"] }],
      desc: "Feteer Meshaltet with Egyptian White Cheese, Black Honey and Tahini, plus a shake of your choice.",
      tags: ["Combo"], img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },

    { id: "meal-for-one", cat: "combos", name: "Meal for One", ar: "وجبة لفرد",
      price: 30.5, worth: 33,
      includes: ["feteer-meshaltet"],
      slots: [{ key: "side", label: "Side", count: 1, options: ["white-cheese", "black-honey", "white-honey", "tahini", "baba-ganoush", "hummus"] },
              { key: "pudding", label: "Pudding", count: 1, options: ["banana-pudding", "chocolate-pudding", "creme-caramel", "rice-pudding"] }],
      desc: "Feteer Meshaltet with one side and one pudding of your choice.",
      tags: ["Combo"], img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },

    { id: "feteer-dip-trio", cat: "combos", name: "Sides Platter", ar: "طبق الإضافات",
      price: 19,
      includes: ["white-cheese", "black-honey", "white-honey", "tahini", "baba-ganoush", "hummus"],
      desc: "All six sides together: Egyptian White Cheese, Black Honey, White Honey, Tahini, Baba Ganoush and Hummus, at a bundled price.",
      tags: ["Combo"], img: "assets/img/menu-real/white-cheese.webp" },

    { id: "pick-3-puddings", cat: "combos", name: "Pick Any 3 Puddings", ar: "اختر ٣ بودينج",
      price: 15, worth: 15,
      includes: ["banana-pudding", "chocolate-pudding", "creme-caramel", "rice-pudding"],
      slots: [{ key: "puddings", label: "Puddings", count: 3, options: ["banana-pudding", "chocolate-pudding", "creme-caramel", "rice-pudding"] }],
      desc: "Any three: Banana Pudding, Chocolate Pudding, Crème Caramel Flan or Rice Pudding, as many of one kind as you like.",
      tags: ["Combo"], img: "assets/img/menu-real/chocolate-pudding.webp" }
  ];

  /* Gallery ----------------------------------------------------------- */
  var GALLERY = [
    { cat: "Feteer",  title: "Layers, pulled apart hot",        img: "assets/img/menu-real/feteer-meshaltet-square.jpg" },
    { cat: "Kitchen", title: "Stretching the dough",            img: "assets/img/menu-real/feteer-meshaltet-wide.jpg" },
    { cat: "Sweet",   title: "Goulash with nuts",               img: "assets/img/menu-real/goulash-nuts.webp" },
    { cat: "Trays",   title: "Macarona béchamel",               img: "assets/img/menu-real/macarona-bechamel.webp" },
    { cat: "Sweet",   title: "Something cold to finish",        img: "assets/img/menu-real/creme-caramel.webp" },
    { cat: "Sides",   title: "Honey, poured cold",              img: "assets/img/menu-real/white-honey.webp" }
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
