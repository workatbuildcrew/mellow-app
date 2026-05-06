/* ══════════════════════════════════════════════
   MELLOW CO. — app.js
   Vanilla JS Single Page Application
   ══════════════════════════════════════════════ */
const client = window.supabase.createClient(
  "https://tjbjhykmnsssfhzltgvs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYmpoeWttbnNzc2Zoemx0Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjA3MjgsImV4cCI6MjA5MDY5NjcyOH0.xs-aX7hX8Of5RhHvA83w3ycgj9l3SV-O2uLOdbZ165k"
);
/* ── Design Constants ── */
const C = {
  white:'#fffef8', cream:'#f5f0e8', creamDark:'#e8dfd0',
  gold:'#c8a96e', goldDark:'#9d7a45',
  brown:'#4a2c0a', brownMid:'#7a4f2a', brownLight:'#a67c52',
  ink:'#1a0f05', red:'#8b1a1a', green:'#2d7a4a'
};

/* ── API Base URL (must be defined here so profile page works before payment.js loads) ── */
function apiBase() {
  return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : '';
}

/* ── Helpers ── */
const USD_TO_INR = 83.5;
const usd = (min, max) => Math.round(((min + max) / 2) * USD_TO_INR);
const fmt = n => `₹${n.toLocaleString('en-IN')}`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const img = id => `https://images.unsplash.com/photo-${id}?w=400&h=280&fit=crop&q=80`;
const imgF = id => `https://images.unsplash.com/photo-${id}?w=800&h=500&fit=crop&q=80`;

/* ══════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   🖼  HOW TO CHANGE PRODUCT IMAGES — EASY GUIDE
   ══════════════════════════════════════════════════════════
   Find any product below and update the img: field.

   OPTION A — Any direct image URL from the internet:
     img: 'https://example.com/your-photo.jpg'

   OPTION B — Unsplash (free high-quality photos):
     Go to unsplash.com, find a photo, right-click the image
     → Copy image address. Paste the full URL here.
     Example: img: 'https://images.unsplash.com/photo-1578985545062?w=400&h=280&fit=crop'

   OPTION C — Local file (place in same folder as index.html):
     img: '/img/my-dessert-photo.jpg'
   ══════════════════════════════════════════════════════════ */
const ALL_PRODUCTS = [
  { id:1,  name:"Tres Leches Cake",
    category:"Handcrafted", badge:"Bestseller", price:usd(5,15),
    desc:"Airy sponge soaked in three silken milks — condensed, evaporated & cream — crowned with whipped cream.",
    img: 'https://www.allrecipes.com/thmb/3zjqR0J3EYdaRwZ97AQAZoUSC5o=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/7399-tres-leches-milk-cake-ddmfs-beauty-2x1-BG-25702-f42c94b10c914753aa4dcb413658b8bf.jpg'
    /* 🖼 REPLACE URL above — search "tres leches cake" on unsplash.com */ },

  { id:2,  name:"Flan de Cajeta",
    category:"Handcrafted", badge:"Signature", price:usd(3,8),
    desc:"48-hour slow-crafted custard crowned with rich cajeta caramel. Our signature creation.",
    img: 'https://mandolina.co/wp-content/uploads/2024/04/Flan-de-Cajeta-Casero-1080x550-1-1200x720.jpg'
    /* 🖼 REPLACE URL above — search "flan caramel custard" */ },

  { id:3,  name:"Churros con Chocolate",
    category:"Handcrafted", badge:null, price:usd(2,6),
    desc:"Hand-piped churros fried golden, dusted with cinnamon sugar, served with dark chocolate dip.",
    img: 'https://i.ytimg.com/vi/uiHBXqPbdMU/hqdefault.jpg'
    /* 🖼 REPLACE URL above — search "churros chocolate" */ },

  { id:4,  name:"Arroz con Leche",
    category:"Handcrafted", badge:null, price:usd(2,5),
    desc:"Creamy Mexican rice pudding perfumed with cinnamon, vanilla, and a whisper of orange zest.",
    img: 'https://xoxobella.com/wp-content/uploads/2022/03/mexican_rice_pudding_arroz_con_leche_bella_bucchiotti_10.jpg'
    /* 🖼 REPLACE URL above — search "rice pudding cinnamon" */ },

  { id:5,  name:"Sopapillas",
    category:"Handcrafted", badge:null, price:usd(3,6),
    desc:"Deep-fried pastry pillows, airy and golden, drizzled with wildflower honey.",
    img: 'https://tornadoughalli.com/wp-content/uploads/2022/04/SOPAPILLA-RECIPE-2.jpg'
    /* 🖼 REPLACE URL above — search "fried pastry honey" */ },

  { id:6,  name:"Chocoflan / Impossible Cake",
    category:"Handcrafted", badge:"Fan Favourite", price:usd(5,10),
    desc:"The magical dual-layer — rich chocolate below, silken flan above. A true marvel of Mexican baking.",
    img: 'https://i.ytimg.com/vi/vXDQO2vGVkU/maxresdefault.jpg'
    /* 🖼 REPLACE URL above — search "chocolate flan cake" */ },

  { id:7,  name:"Conchas",
    category:"Handcrafted", badge:null, price:usd(1,3),
    desc:"Iconic pan dulce with a sweet shell-patterned sugar topping in vanilla or chocolate.",
    img: 'https://bakefromscratch.com/wp-content/uploads/2018/04/Conchas022JB-e1653660177854.jpg'
    /* 🖼 REPLACE URL above — search "pan dulce conchas bread" */ },

  { id:8,  name:"Mexican Wedding Cookies",
    category:"Handcrafted", badge:null, price:usd(3,7),
    desc:"Buttery pecan shortbread rolled in powdered sugar. Melt-in-your-mouth perfection.",
    img: 'https://i.ytimg.com/vi/Yh6W1guAOxA/sddefault.jpg'
    /* 🖼 REPLACE URL above — search "shortbread cookies powdered sugar" */ },

  { id:9,  name:"Fresas con Crema",
    category:"Handcrafted", badge:"Seasonal", price:usd(3,6),
    desc:"Sun-ripened strawberries folded into luscious Mexican crema with a hint of vanilla.",
    img: 'https://trufluencykids.com/wp-content/uploads/2025/07/tfk-0815-feat-2025-1200x627-1-1080x627.jpg'
    /* 🖼 REPLACE URL above — search "strawberries cream dessert" */ },

  { id:10, name:"Capirotada",
    category:"Handcrafted", badge:null, price:usd(3,7),
    desc:"Traditional bread pudding with piloncillo syrup, raisins, cinnamon, and aged cheese.",
    img: 'https://www.caciquefoods.com/wp-content/uploads/2022/02/CACIQUE-CAPIROTADA.jpg'
    /* 🖼 REPLACE URL above — search "bread pudding raisins" */ },

  { id:11, name:"Paletas de Fruta",
    category:"Handcrafted", badge:"kids Favourite", price:usd(1,3),
    desc:"Artisan ice pops made with real mango, tamarind, strawberry, or hibiscus.",
    img: 'https://www.redpathsugar.com/assets/uploads/img/Paletas-Mexican-Ice-Pops.jpg'
    /* 🖼 REPLACE URL above — search "fruit popsicle ice pop" */ },

  { id:12, name:"Buñuelos",
    category:"Handcrafted", badge:null, price:usd(2,5),
    desc:"Crispy, paper-thin fried tortillas showered with cinnamon and piloncillo sugar.",
    img: 'https://www.caciquefoods.com/wp-content/uploads/2022/11/bunuelos-mexican-crema.jpg'
    /* 🖼 REPLACE URL above — search "crispy fried pastry cinnamon" */ },

  { id:13, name:"Jericalla",
    category:"Handcrafted", badge:"Chef's Pick", price:usd(3,6),
    desc:"A custard from Guadalajara — richer than crème brûlée with a lightly scorched top.",
    img: 'https://i.ytimg.com/vi/p3d5CV2XMUo/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDwMopv1c-Rm2-XAok0MpAA6hDcrQ'
    /* 🖼 REPLACE URL above — search "creme brulee custard scorched" */ },

  { id:14, name:"Pan de Elote",
    category:"Handcrafted", badge:null, price:usd(3,6),
    desc:"Tender, naturally sweet corn cake with a golden crust. Simple, honest and satisfying.",
    img: 'https://www.greenpan.us/cdn/shop/articles/sweet_corn_cake_b42a0845-4058-4eb0-bc02-784650453059.png?v=1748938427'
    /* 🖼 REPLACE URL above — search "corn cake sweet golden" */ },

  { id:15, name:"Carlota de Limón",
    category:"Handcrafted", badge:null, price:usd(3,7),
    desc:"No-bake lime icebox cake layered with Maria cookies and tangy cream.",
    img: 'https://www.recetario-cocina.com/archivosbd/carlota-de-limon.png'
    /* 🖼 REPLACE URL above — search "lime icebox cake" */ },

  { id:16, name:"Pastel de Tres Leches Rosas",
    category:"Handcrafted", badge:"New", price:850,
    desc:"Rose-water Tres Leches layered with fresh berries — our most romantic creation.",
    img: 'https://chocoyamma.com/wp-content/uploads/2025/12/rose-milk-tres-leches-cak1.jpg'
    /* 🖼 REPLACE URL above — search "rose berry layer cake" */ },

  { id:17, name:"Tamales Dulces",
    category:"Handcrafted", badge:null, price:220,
    desc:"Sweet masa tamales filled with raisins, cinnamon, and piloncillo, wrapped in corn husks.",
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwvHtt3jn4wnDwiVdQg_kKAs29dw1KZRj7Lw&s'
    /* 🖼 REPLACE URL above — search "tamales corn husk" */ },

  { id:18, name:"Marquesa de Chocolate",
    category:"Handcrafted", badge:"BestSeller", price:680,
    desc:"No-bake layered chocolate mousse cake with Maria biscuits. Rich and deeply satisfying.",
    img: 'https://s1.dmcdn.net/v/WIosm1cw3_Z4_7kmd/x1080'
    /* 🖼 REPLACE URL above — search "chocolate mousse layered cake" */ },

  { id:19, name:"Caramel Trilece",
    category:"Store-Bought", badge:null, price:175,
    desc:"Light sponge soaked in a silky three-milk bath and topped with a glossy, burnt-sugar glaze.",
    img: 'https://img.freepik.com/premium-photo/trilece-dessert-slice-dessert-with-caramel-milk-dark-background-bakery-products-side-view-closeup_659681-5101.jpg'
    /* 🖼 REPLACE URL above — search "wafer candy snack" */ },

  { id:20, name:"Strawberry Mostachon",
    category:"Store-Bought", badge:"Iconic", price:usd(1,4),
    desc:"Crunchy pecan-meringue crust topped with cool cream cheese frosting and fresh strawberries.",
    img: 'https://thumbs.dreamstime.com/b/delicious-homemade-mostachon-decorated-strawberries-delicious-homemade-mostachon-decorated-strawberries-wooden-table-229573617.jpg'
    /* 🖼 REPLACE URL above — search "chocolate snack cake" */ },

  { id:21, name:"Seven Layer Dip (jar)",
    category:"Store-Bought", badge:"Iconic", price:450,
    desc:"Seven layers of festive Mexican flavors — from seasoned beans to cooling crema.",
    img: 'https://wholefully.com/wp-content/uploads/2022/02/seven-layer-dips-cilantro-lime.jpg'
    /* 🖼 REPLACE URL above — search "caramel dulce de leche jar" */ },

  { id:22, name:"Gelatina de Mosaico",
    category:"Store-Bought", badge:null, price:usd(2,5),
    desc:"Vibrant cubes of fruit-flavored gelatin in a creamy, sweet milk base that melts into a cool",
    img: 'https://www.maricruzavalos.com/wp-content/uploads/2020/12/gelatin_mosaic.jpg'
    /* 🖼 REPLACE URL above — search "peanut candy marzipan" */ },

  { id:23, name:"Coconut Panna Cotta",
    category:"Store-Bought", badge:"Chef's pick", price:usd(5,7),
    desc:"Silky coconut panna cotta made with real coconut milk and a hint of vanilla.",
    img: 'https://img.freepik.com/premium-photo/coconut-panna-cotta-with-toasted-coconut-flakes_1179130-195598.jpg'
    /* 🖼 REPLACE URL above — search "ice cream frozen bar mango" */ },

  { id:24, name:"Pot de crème",
    category:"Store-Bought", badge:"Fan Favourite", price:320,
    desc:"Velvety-smooth French custard — the ultimate rich, melt-in-your-mouth dessert classic.",
    img: 'https://i2.wp.com/www.downshiftology.com/wp-content/uploads/2023/02/Chocolate-Pots-De-Creme-main.jpg'
    /* 🖼 REPLACE URL above — search "tamarind candy spicy sweet" */ },

  { id:25, name:"Avocado Enchilada Casserole",
    category:"Store-Bought", badge:"Spicy", price:280,
    desc:"Avocado meets melted cheese and zesty spice in this creamy, golden-baked fiesta.",
    img: 'https://avocadosfrommexico.com/wp-content/uploads/2025/07/avo_mexican_casserole-296x345-1.jpg'
    /* 🖼 REPLACE URL above — search "marzipan rose candy" */ },
];

const FEATURED = [1, 2, 6, 13].map(id => ALL_PRODUCTS.find(p => p.id === id));
const CATEGORIES = ['All', 'Handcrafted', 'Store-Bought'];
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Puducherry"];

const HERO_IMAGE = "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=600&fit=crop&q=80";
const ABOUT_IMAGE = "https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=600&h=750&fit=crop&q=80";
const TEAM = [
  { name:"Maria Vega",     role:"Co-Founder & Head Pastry Chef",    img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80" },
  { name:"Roberto Vega",   role:"Co-Founder & Operations Director", img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80" },
  { name:"Lucia Torres",   role:"Creative Director",                img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=80" },
];
const BLOG_FEATURED_IMAGE = img('1551024601-bec78aea704b');
const BLOG_POSTS = [
  { tag:"Recipe",          title:"How to Make Authentic Churros at Home",                         date:"Oct 28, 2024", img: img('1562440499-64c9a111f713') },
  { tag:"Couples",         title:"Sofia & James: How a Dessert Became Their Anniversary Ritual",  date:"Oct 12, 2024", img: img('1464965191934-13ea98d71a33') },
  { tag:"Behind the Scenes",title:"Visiting Our Cajeta Producers in Celaya, Guanajuato",          date:"Sep 30, 2024", img: img('1587854692152-cbe660dbde88') },
  { tag:"New Arrival",     title:"Introducing Pastel de Tres Leches Rosas — Our Newest Creation", date:"Sep 15, 2024", img: img('1586985289906-406988974504') },
];

/* ══════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════ */
const S = {
  page: 'home',
  cart: {},
  cartOpen: false,
  storeView: 'store',
  checkStep: 1,
  category: 'All',
  search: '',
  toast: null,
  toastTimer: null,
  payMethod: 'upi',
  processing: false,
  errors: {},
  form: { name:'', email:'', phone:'', address:'', city:'', state:'Tamil Nadu', pin:'' },
  upiId: '',
  card: { number:'', name:'', expiry:'', cvv:'' },
  contactForm: { name:'', email:'', subject:'General Enquiry', msg:'' },
  newsletter: '',
  navOpen: false,
  orderId: null,
  profileView: 'orders',   // 'orders' | 'settings'
};

/* ── Pre-fill delivery form from saved profile (called after login/session restore) ── */
function prefillFormFromProfile() {
  const p = AUTH?.profile || {};
  const u = AUTH?.user || {};
  // Only fill fields that are currently empty — never overwrite what user typed
  if (!S.form.name  && p.name)  S.form.name  = p.name;
  if (!S.form.email && (p.email || u.email)) S.form.email = p.email || u.email;
  if (!S.form.phone && p.phone) S.form.phone = p.phone;
  // Address fields from localStorage (persisted across sessions)
  try {
    const saved = JSON.parse(localStorage.getItem('mellow_delivery') || '{}');
    if (!S.form.address && saved.address) S.form.address = saved.address;
    if (!S.form.city    && saved.city)    S.form.city    = saved.city;
    if (!S.form.state   && saved.state)   S.form.state   = saved.state;
    if (!S.form.pin     && saved.pin)     S.form.pin     = saved.pin;
  } catch {}
}

/* ── Persist delivery address to localStorage after user fills it ── */
function saveDeliveryToLocal() {
  try {
    localStorage.setItem('mellow_delivery', JSON.stringify({
      address: S.form.address,
      city:    S.form.city,
      state:   S.form.state,
      pin:     S.form.pin,
    }));
  } catch {}
}

/* ── Cart Computed ── */
function cartItems()  { return ALL_PRODUCTS.filter(p => (S.cart[p.id]||0) > 0); }
function cartCount()  { return Object.values(S.cart).reduce((a,b)=>a+b,0); }
function subtotal()   { return cartItems().reduce((a,p)=>a+(p.price*(S.cart[p.id]||0)),0); }
function delivery()   { const s=subtotal(); return s>=999?0:s>0?60:0; }
function tax()        { return Math.round(subtotal()*0.05); }
function total()      { return subtotal()+delivery()+tax(); }
function grandTotal() { return typeof discountedTotal === 'function' ? discountedTotal() : total(); }

/* ── Filter ── */
function filtered() {
  return ALL_PRODUCTS.filter(p =>
    (S.category==='All' || p.category===S.category) &&
    (p.name.toLowerCase().includes(S.search.toLowerCase()) ||
     p.desc.toLowerCase().includes(S.search.toLowerCase()))
  );
}

/* ══════════════════════════════════════════════
   ACTIONS
   ══════════════════════════════════════════════ */
function navigate(pg) {
  S.page = pg;
  if(pg==='desserts') { S.storeView='store'; S.checkStep=1; }
  S.navOpen = false;
  // Update URL hash so refresh stays on current page
  history.replaceState(null, '', '#' + pg);
  window.scrollTo({top:0,behavior:'smooth'});
  render();
}

/* ── Open profile with a specific view ── */
if (typeof openProfilePage === 'undefined') {
  function openProfilePage(view) {
    if (!AUTH.user) { openAuth('login'); return; }
    S.profileView = view || 'orders';
    navigate('profile');
  }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(()=>{ el.classList.remove('visible'); }, 2200);
}

function addItem(id) {
  S.cart[id] = (S.cart[id]||0)+1;
  showToast('Added to cart ✦');
  renderCart();
  updateCardQty(id);
  renderNav(); // update cart badge count
}
function decItem(id) {
  S.cart[id] = Math.max(0,(S.cart[id]||0)-1);
  renderCart();
  updateCardQty(id);
  renderNav();
}

// Update only the qty controls on a single product card — no full page re-render
function updateCardQty(id) {
  const card = document.getElementById('pcard-' + id);
  if (!card) return;
  const qty = S.cart[id]||0;
  const footer = card.querySelector('.product-footer');
  if (!footer) return;
  const priceEl = footer.querySelector('.product-price');
  const priceHTML = priceEl ? priceEl.outerHTML : '';
  footer.innerHTML = priceHTML + (qty === 0
    ? `<button class="btn-add" onclick="addItem(${id})">+ Add</button>`
    : `<div class="qty-controls">
         <button class="qty-btn" onclick="decItem(${id})">−</button>
         <span class="qty-val">${qty}</span>
         <button class="qty-btn" onclick="addItem(${id})">+</button>
       </div>`);
}

function openCart()  { S.cartOpen=true;  renderCart(); document.getElementById('cart-backdrop').classList.add('open'); document.getElementById('cart-drawer').classList.add('open'); }
function closeCart() { S.cartOpen=false; document.getElementById('cart-backdrop').classList.remove('open'); document.getElementById('cart-drawer').classList.remove('open'); }

function goCheckout() { closeCart(); navigate('desserts'); S.storeView='checkout'; S.checkStep=1; render(); }

function validateDelivery() {
  const e={}, f=S.form;
  if(!f.name.trim()) e.name='Required';
  if(!f.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email='Valid email required';
  if(!f.phone.match(/^[6-9]\d{9}$/)) e.phone='10-digit mobile required';
  if(!f.address.trim()) e.address='Required';
  if(!f.city.trim()) e.city='Required';
  if(!f.pin.match(/^\d{6}$/)) e.pin='6-digit PIN required';
  S.errors=e; return !Object.keys(e).length;
}

function validatePayment() {
  const e={};
  if(S.payMethod==='upi' && !S.upiId.match(/^[\w.\-_]+@[\w]+$/)) e.upi='Valid UPI ID (e.g. name@upi)';
  if(S.payMethod==='card'){
    if(!S.card.number.replace(/\s/g,'').match(/^\d{16}$/)) e.cardNum='16-digit card number';
    if(!S.card.name.trim()) e.cardName='Name on card required';
    if(!S.card.expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) e.cardExp='Format MM/YY';
    if(!S.card.cvv.match(/^\d{3,4}$/)) e.cardCvv='3–4 digits';
  }
  S.errors=e; return !Object.keys(e).length;
}

function placeOrder() {
  if(!validatePayment()) { renderPage(); return; }
  S.processing=true;
  S.orderId = Math.floor(Math.random()*90000+10000);
  renderPage();
  setTimeout(()=>{ S.processing=false; S.storeView='success'; render(); }, 2800);
}

function fmtCard(v) { return v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim(); }
function fmtExp(v)  { v=v.replace(/\D/g,'').slice(0,4); return v.length>=3?v.slice(0,2)+'/'+v.slice(2):v; }

/* ══════════════════════════════════════════════
   HTML BUILDERS
   ══════════════════════════════════════════════ */

/* ── NAV ── */
function buildNav() {
  const links = [
    {key:'home',label:'Home'},{key:'about',label:'About'},
    {key:'desserts',label:'Desserts'},{key:'blog',label:'Journal'},{key:'contact',label:'Contact'},
  ];
  const cnt = cartCount();
  return `
    <button class="nav-logo" onclick="navigate('home')"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP-uq7xU6FATSkp6EY7HNCTi4lgIlG4TmTkQ&s" alt="Mellow Co." class="nav-logo-img" /><span class="nav-logo-text">Mellow <span>Co.</span></span></button>
    <div class="nav-links">
      ${links.map(l=>`<button class="nav-link${S.page===l.key?' active':''}" onclick="navigate('${l.key}')">${l.label}</button>`).join('')}
      <button class="btn-support" onclick="navigate('desserts')">Order Now</button>
      <button class="btn-cart" onclick="openCart()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        ${cnt>0 ? `<span class="cart-badge">${cnt}</span>` : ''}
      </button>
    </div>
    <button class="nav-hamburger${S.navOpen?' open':''}" onclick="toggleNav()" aria-label="Menu" aria-expanded="${S.navOpen}">
      <span></span><span></span><span></span>
    </button>
  `;
}

function buildMobileNav() {
  const links = [
    {key:'home',label:'Home'},{key:'about',label:'About'},
    {key:'desserts',label:'Desserts'},{key:'blog',label:'Journal'},{key:'contact',label:'Contact'},
  ];
  const cnt = cartCount();
  const user = (typeof AUTH !== 'undefined' && AUTH.user);
  return `
    <div class="nav-mobile-overlay${S.navOpen?' open':''}" onclick="closeNav()"></div>
    <div class="nav-mobile-menu${S.navOpen?' open':''}" role="dialog" aria-modal="true">
      <button class="nav-mobile-close" onclick="closeNav()" aria-label="Close">✕</button>
      <div class="nav-mobile-links">
        ${links.map(l=>`<button class="nav-mobile-link${S.page===l.key?' active':''}" onclick="navigate('${l.key}')">${l.label}</button>`).join('')}
        ${user ? `<button class="nav-mobile-link${S.page==='profile'?' active':''}" onclick="navigate('profile')">My Account</button>` : `
          <button class="nav-mobile-link" onclick="closeNav();openAuth('login')" style="color:var(--brown)">Sign In</button>
          <button class="nav-mobile-link" onclick="closeNav();openAuth('signup')" style="color:var(--gold-dk);font-weight:600">Sign Up</button>`}
      </div>
      <div class="nav-mobile-actions">
        <button class="nav-mobile-btn-order" onclick="navigate('desserts')">Order Now</button>
        <button class="nav-mobile-btn-cart" onclick="closeNav();openCart()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Cart${cnt > 0 ? ` (${cnt})` : ''}
        </button>
      </div>
    </div>
  `;
}

function closeNav() { S.navOpen = false; renderNav(); }
function toggleNav() { S.navOpen = !S.navOpen; renderNav(); }

/* ── ORNAMENT ── */
function OrnDiv(text='✦') {
  return `<div class="orn-div">
    <div class="orn-line"></div>
    <span class="orn-text">${text}</span>
    <div class="orn-line right"></div>
  </div>`;
}

/* ── NEWSLETTER ── */
function NewsletterSection() {
  return `
  <section class="newsletter-section">
    <div class="newsletter-inner">
      <div class="newsletter-icon">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${C.gold}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <h2 class="newsletter-title">Join the Mellow Circle</h2>
      <p class="newsletter-sub">Subscribe and receive seasonal recipes, behind-the-scenes stories, and exclusive offers — delivered to your inbox.</p>
      <div class="newsletter-form">
        <input class="newsletter-input" id="newsletter-inp" type="email" placeholder="Your email address…" value="${esc(S.newsletter)}" oninput="S.newsletter=this.value" />
        <button class="newsletter-btn" onclick="handleNewsletter()">Subscribe</button>
      </div>
    </div>
  </section>`;
}

async function handleNewsletter() {
  const email = (document.getElementById('newsletter-inp')?.value || '').trim();
  const name  = AUTH.profile?.name || AUTH.user?.email?.split('@')[0] || 'Mellow Fan';
  if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    showToast('\u26a0 Please enter a valid email address.');
    return;
  }

  try {
    const res  = await fetch(apiBase() + '/api/newsletter-subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, name }),
    });
    const data = await res.json();

    if (data.already_subscribed) {
      showToast('\u2756 You are already a Mellow Circle member!');
    } else if (data.ok) {
      const pct = data.discount_pct || 10;
      showToast(`\u2756 Welcome! Your ${pct}% discount code has been sent to ${email}`);
    } else {
      throw new Error(data.error || 'Subscribe failed');
    }
  } catch(err) {
    console.warn('Newsletter subscribe error:', err.message);
    showToast('\u2756 Subscribed! Welcome to the Mellow Circle.');
  }

  S.newsletter = '';
  const inp = document.getElementById('newsletter-inp');
  if (inp) inp.value = '';
}



/* ── FOOTER ── */
function Footer() {
  const cols = [
    {title:'Explore',  links:[['Home','home'],['About','about'],['Desserts','desserts'],['Journal','blog']]},
    {title:'Support',  links:[['Contact','contact'],['FAQ','contact'],['Wholesale','contact'],['Find a Diner','contact']]},
    {title:'Legal',    links:[['Privacy Policy',''],['Terms',''],['Cookie Policy','']]},
  ];
  return `
  <footer>
    <div>
      <div class="footer-logo">Mellow <span>Co.</span></div>
      <p class="footer-desc">Artisan Mexican desserts made with meticulous attention to detail and served with love at your favourite diners since 2008.</p>
      <div class="footer-socials">
        ${['✦','◈','⊕'].map(s=>`<div class="footer-social">${s}</div>`).join('')}
      </div>
    </div>
    ${cols.map(col=>`
      <div>
        <p class="footer-col-title">${col.title}</p>
        <ul class="footer-links">
          ${col.links.map(([l,pg])=>`<li><button class="footer-link-btn" onclick="${pg?`navigate('${pg}')`:'void(0)'}";>${l}</button></li>`).join('')}
        </ul>
      </div>`).join('')}
  </footer>
  <div class="footer-bottom">
    <span>© 2024 Mellow Co. All rights reserved.</span>
    <span>Crafted with ❤️ for couples everywhere</span>
  </div>`;
}

/* ── PRODUCT CARD ── */
function ProductCard(p) {
  const qty = S.cart[p.id]||0;
  return `
  <div class="product-card" id="pcard-${p.id}">
    <div class="product-img">
      <img src="${p.img}" alt="${esc(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=280&fit=crop&q=80'" loading="lazy" />
      ${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ''}
    </div>
    <div class="product-body">
      <p class="product-cat">${esc(p.category)}</p>
      <h3 class="product-name">${esc(p.name)}</h3>
      <p class="product-desc">${esc(p.desc)}</p>
      <div class="product-footer">
        <span class="product-price">${fmt(p.price)}</span>
        ${qty===0
          ? `<button class="btn-add" onclick="addItem(${p.id})">+ Add</button>`
          : `<div class="qty-controls">
               <button class="qty-btn" onclick="decItem(${p.id})">−</button>
               <span class="qty-val">${qty}</span>
               <button class="qty-btn" onclick="addItem(${p.id})">+</button>
             </div>`}
      </div>
    </div>
  </div>`;
}

/* ── VALUES STRIP ── */
function ValuesStrip() {
  const values = [
    {icon:'🌿',name:'Authenticity',text:'Honouring time-tested Mexican recipes.'},
    {icon:'✨',name:'Excellence',text:'Perfection in every detail.'},
    {icon:'❤️',name:'Love & Care',text:'Made as if crafted for someone special.'},
    {icon:'🤝',name:'Partnership',text:'Lasting bonds with diner partners.'},
    {icon:'🌍',name:'Community',text:'Supporting local producers & artisans.'},
    {icon:'🏆',name:'Integrity',text:'Transparent ingredients, honest practice.'},
  ];
  return `
  <div class="values-strip">
    <div class="values-inner">
      <div class="values-head">
        <div>
          <span class="sec-eye" style="color:${C.gold}">Our Values</span>
          <h2 style="font-family:'Playfair Display',serif;font-size:1.9rem;font-weight:900;color:${C.white};line-height:1.1">
            What We <em style="color:${C.gold};font-style:italic">Stand For</em>
          </h2>
        </div>
        <p style="color:rgba(255,255,255,0.55);font-style:italic;font-size:0.95rem;max-width:380px;line-height:1.7">
          Every dessert reflects deeply held principles — passion, patience, and pride.
        </p>
      </div>
      <div class="values-grid">
        ${values.map(v=>`
          <div class="value-card">
            <span class="value-icon">${v.icon}</span>
            <div class="value-name">${v.name}</div>
            <div class="value-text">${v.text}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════
   PAGES
   ══════════════════════════════════════════════ */

/* ── HOME PAGE ── */
function HomePage() {
  return `
  <div>
    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-text fade-up">
        <div class="hero-badge">✦ &nbsp; Est. 2008 · Artisan Mexican Desserts &nbsp; ✦</div>
        <h1 class="hero-title">
          Sweetness Crafted<br/>
          <em>with Love &amp; Tradition</em>
        </h1>
        <p class="hero-sub">Handcrafted Mexican desserts made with meticulous attention to detail, served at your favourite diners across India.</p>
        <div class="hero-btns">
          <button class="btn-primary" onclick="navigate('desserts')">Explore Desserts</button>
          <button class="btn-secondary" onclick="navigate('about')">Our Story</button>
        </div>
      </div>
      <div class="hero-image-wrap fade-up-2">
        <div class="hero-circle-outer">
          <div class="float-img" style="width:100%;height:100%;position:relative">
            <div class="hero-circle">
              <img src="${HERO_IMAGE}" alt="Artisan Dessert" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=600&fit=crop'" />
              <div class="hero-ring1"></div>
              <div class="hero-ring2 spin-slow"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${OrnDiv('✦ &nbsp; HANDCRAFTED WITH PRIDE &nbsp; ✦')}

    <!-- FEATURED -->
    <section class="featured-section">
      <div class="text-center mb-3">
        <span class="sec-eye">Signature Collection</span>
        <h2 class="sec-title">Our Most <em style="color:${C.goldDark};font-style:italic">Beloved</em> Creations</h2>
      </div>
      <div class="featured-grid">
        ${FEATURED.map(p=>`
          <div class="featured-card" onclick="navigate('desserts')">
            <div class="featured-img">
              <img src="${p.img}" alt="${esc(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=280&fit=crop'" loading="lazy" />
            </div>
            <div class="featured-body">
              <h3 class="featured-name">${esc(p.name)}</h3>
              <p class="featured-desc">${esc(p.desc.slice(0,72))}…</p>
              <span class="featured-price">${fmt(p.price)}</span>
            </div>
          </div>`).join('')}
      </div>
      <div class="text-center" style="margin-top:2.5rem">
        <button class="btn-primary" style="padding:0.9rem 2.2rem;font-size:1rem" onclick="navigate('desserts')">View All 25 Desserts →</button>
      </div>
    </section>

    ${OrnDiv('✦ &nbsp; A TASTE OF MEXICO &nbsp; ✦')}

    <!-- TESTIMONIALS -->
    <section class="testimonials-section">
      <div class="testimonials-quote-bg">"</div>
      <div class="text-center mb-3">
        <span class="sec-eye" style="color:${C.gold}">Testimonials</span>
        <h2 class="sec-title" style="color:${C.white}">Loved by <em style="color:${C.gold};font-style:italic">Couples</em></h2>
      </div>
      <div class="testimonials-grid">
        ${[
          {text:"We discovered Mellow on our anniversary. The churros were extraordinary — we request them every single visit now.",author:"Sofia & James, Toronto"},
          {text:"There is something deeply comforting about a Mellow dessert. Unhurried, refined, thoroughly satisfying. Our Sunday ritual.",author:"Carmen & Luis, Miami"},
          {text:"My husband and I share a Mellow flan every Friday. It has become our weekly reminder of why we chose each other.",author:"Isabelle & David, Chicago"},
        ].map(t=>`
          <div class="testimonial-card">
            <span class="testimonial-quot">"</span>
            <p class="testimonial-text">${esc(t.text)}</p>
            <p class="testimonial-author">— ${esc(t.author)}</p>
          </div>`).join('')}
      </div>
    </section>

    ${NewsletterSection()}
    ${Footer()}
  </div>`;
}

/* ── ABOUT PAGE ── */
function AboutPage() {
  return `
  <div>
    <section style="background:${C.white};padding:6rem 2.5rem 4rem;text-align:center;border-bottom:2px solid ${C.gold}">
      <span class="sec-eye">✦ &nbsp; Our Story &nbsp; ✦</span>
      <h1 class="sec-title">More Than Desserts —<br/><em style="color:${C.goldDark};font-style:italic">A Labour of Love</em></h1>
      <p class="sec-sub" style="margin:1rem auto 0">Since 2008, Mellow has brought authentic Mexican flavours to couples who appreciate craftsmanship.</p>
    </section>

    <section style="padding:5rem 2.5rem;background:${C.white}">
      <div class="about-story-grid">
        <div class="about-image-box">
          <img src="${ABOUT_IMAGE}" alt="Our Story" onerror="this.style.display='none'" />
        </div>
        <div>
          <span class="sec-eye">Founded with Passion</span>
          <h2 class="sec-title" style="margin-bottom:1.2rem">Born in a Family <em style="color:${C.goldDark};font-style:italic">Kitchen</em></h2>
          <p style="font-size:1.05rem;line-height:1.9;color:${C.brownMid};margin-bottom:1rem;font-style:italic">Mellow was founded by Maria and Roberto Vega in 2008, born from a simple desire: to share the desserts of their childhood with the world.</p>
          <p style="font-size:1rem;line-height:1.9;color:${C.brownMid};margin-bottom:1rem">Growing up in Oaxaca, Maria learned the art of flan, churros, and arroz con leche from her grandmother, who insisted that great desserts require time, patience, and love above all else.</p>
          <p style="font-size:1rem;line-height:1.9;color:${C.brownMid}">What began as a small kitchen operation supplying two local diners has grown into a beloved brand trusted by establishments across India — yet our values have never changed.</p>
        </div>
      </div>
    </section>

    ${OrnDiv('✦ &nbsp; BY THE NUMBERS &nbsp; ✦')}

    <section style="background:${C.cream};padding:4rem 2.5rem">
      <div class="stats-grid">
        ${[['16','Years of Craft'],['200+','Partner Diners'],['25','Signature Recipes'],['∞','Sweet Memories']].map(([n,l])=>`
          <div>
            <div class="stat-num">${n}</div>
            <div class="stat-label">${l}</div>
          </div>`).join('')}
      </div>
    </section>

    <section style="background:${C.white};padding:5rem 2.5rem">
      <div class="text-center mb-3">
        <span class="sec-eye">The Team</span>
        <h2 class="sec-title">The People <em style="color:${C.goldDark};font-style:italic">Behind</em> the Magic</h2>
      </div>
      <div class="team-grid">
        ${TEAM.map(m=>`
          <div class="team-card">
            <div class="team-avatar">
              <img src="${m.img}" alt="${esc(m.name)}" onerror="this.style.display='none'" />
            </div>
            <div class="team-name">${esc(m.name)}</div>
            <div class="team-role">${esc(m.role)}</div>
          </div>`).join('')}
      </div>
    </section>

    ${NewsletterSection()}
    ${Footer()}
  </div>`;
}

/* ── DESSERTS PAGE ── */
function DessertsPage() {
  if(S.storeView==='checkout') return CheckoutView();
  if(S.storeView==='success')  return SuccessView();

  const items = filtered();
  return `
  <div>
    <section class="desserts-header">
      <div class="desserts-header-bg"></div>
      <span class="sec-eye" style="color:${C.gold};position:relative">✦ &nbsp; Artisan Collection &nbsp; ✦</span>
      <h1 class="sec-title" style="color:${C.white};position:relative">Our <em style="color:${C.gold};font-style:italic">Dessert</em> Creations</h1>
      <p class="sec-sub" style="color:rgba(255,255,255,0.6);position:relative">25 signature recipes, each a labour of love. All prices in Indian Rupees ₹.</p>
    </section>

    <div class="filters-bar">
      <input class="search-input" id="search-inp" type="text" placeholder="Search desserts…" value="${esc(S.search)}" oninput="handleSearch(this.value)" />
      ${CATEGORIES.map(c=>`<button class="filter-btn${S.category===c?' active':''}" onclick="handleCategory('${c}')">${c}</button>`).join('')}
      <span class="filter-count">${items.length} items</span>
    </div>

    <div class="products-grid">
      ${items.length ? items.map(p=>ProductCard(p)).join('') : `<div class="empty-state">No desserts found for "${esc(S.search)}"</div>`}
    </div>

    ${NewsletterSection()}
    ${Footer()}
  </div>`;
}

function handleSearch(val) {
  S.search = val;
  // Re-render only the grid
  const grid = document.querySelector('.products-grid');
  const countEl = document.querySelector('.filter-count');
  if(grid) {
    const items = filtered();
    if(countEl) countEl.textContent = items.length + ' items';
    grid.innerHTML = items.length ? items.map(p=>ProductCard(p)).join('') : `<div class="empty-state">No desserts found for "${esc(S.search)}"</div>`;
  }
}

function handleCategory(cat) {
  S.category = cat;
  const grid = document.querySelector('.products-grid');
  const countEl = document.querySelector('.filter-count');
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(b => { b.classList.toggle('active', b.textContent===cat); });
  if(grid) {
    const items = filtered();
    if(countEl) countEl.textContent = items.length + ' items';
    grid.innerHTML = items.length ? items.map(p=>ProductCard(p)).join('') : `<div class="empty-state">No desserts found for "${esc(S.search)}"</div>`;
  }
}

/* ── CHECKOUT VIEW ── */
function CheckoutView() {
  const f = S.form;
  const e = S.errors;
  const inp = (field, type='text', placeholder='', maxlen='') =>
    `<input class="form-input${e[field]?' error':''}" id="inp-${field}" type="${type}" placeholder="${placeholder}"
      value="${esc(f[field]||'')}" ${maxlen?`maxlength="${maxlen}"`:''}
      oninput="handleFormInput('${field}',this.value)" onblur="handleFormBlur()" />
     ${e[field]?`<div class="form-error">${esc(e[field])}</div>`:''}`;

  return `
  <div class="checkout-wrap">
    <button class="btn-secondary" style="margin-bottom:1.5rem;font-size:0.9rem;padding:0.5rem 1rem" onclick="S.storeView='store';renderPage()">← Back to Desserts</button>
    <h2 class="sec-title" style="border-bottom:2px solid ${C.gold};padding-bottom:1rem;margin-bottom:2rem">Checkout ✦</h2>

    <div class="stepper">
      <div class="step-circle ${S.checkStep>1?'done':'active'}">1</div>
      <span class="step-label" style="color:${S.checkStep===1?C.brown:C.brownLight}">Delivery Details</span>
      <span class="step-sep">›</span>
      <div class="step-circle ${S.checkStep===2?'active':'pending'}">2</div>
      <span class="step-label" style="color:${S.checkStep===2?C.brown:C.brownLight}">Payment</span>
    </div>

    <div class="checkout-grid">
      <div>
        ${S.checkStep===1 ? `
          <span class="sec-eye" style="margin-bottom:1.2rem;display:block">✦ &nbsp; Delivery Information</span>
          <div class="form-group">
            <label class="form-label">Full Name</label>
            ${inp('name','text','As per delivery address')}
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email</label>
              ${inp('email','email','you@example.com')}
            </div>
            <div class="form-group">
              <label class="form-label">Mobile</label>
              <input class="form-input${e.phone?' error':''}" id="inp-phone" type="tel" placeholder="10-digit number"
                value="${esc(f.phone)}" maxlength="10"
                oninput="handleFormInput('phone',this.value.replace(/\\D/g,'').slice(0,10));this.value=S.form.phone" onblur="handleFormBlur()" />
              ${e.phone?`<div class="form-error">${esc(e.phone)}</div>`:''}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Delivery Address</label>
            <textarea class="form-input${e.address?' error':''}" id="inp-address" rows="3" placeholder="Door no., Street, Locality…"
              style="resize:vertical;min-height:80px"
              oninput="handleFormInput('address',this.value)">${esc(f.address)}</textarea>
            ${e.address?`<div class="form-error">${esc(e.address)}</div>`:''}
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">City</label>
              ${inp('city','text','City')}
            </div>
            <div class="form-group">
              <label class="form-label">PIN Code</label>
              <input class="form-input${e.pin?' error':''}" id="inp-pin" type="text" placeholder="6-digit PIN"
                value="${esc(f.pin)}" maxlength="6"
                oninput="handleFormInput('pin',this.value.replace(/\\D/g,'').slice(0,6));this.value=S.form.pin" onblur="handleFormBlur()" />
              ${e.pin?`<div class="form-error">${esc(e.pin)}</div>`:''}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">State</label>
            <select class="form-input" id="inp-state" onchange="handleFormInput('state',this.value)">
              ${STATES.map(s=>`<option${s===f.state?' selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <button class="btn-primary" style="width:100%;padding:1rem;justify-content:center;margin-top:0.5rem"
            onclick="handleDeliveryContinue()">Continue to Payment →</button>
        ` : `
          <span class="sec-eye" style="margin-bottom:1.2rem;display:block">✦ &nbsp; Payment Method</span>
          <div class="payment-tabs">
            ${[['upi','📱 UPI'],['card','💳 Card'],['cod','🏠 Cash on Delivery']].map(([m,l])=>`
              <button class="pay-tab${S.payMethod===m?' active':''}" onclick="setPayMethod('${m}')">${l}</button>`).join('')}
          </div>
          ${S.payMethod==='upi' ? `
            <div class="form-group">
              <label class="form-label">UPI ID</label>
              <input class="form-input${e.upi?' error':''}" type="text" placeholder="yourname@upi"
                value="${esc(S.upiId)}" oninput="S.upiId=this.value" />
              ${e.upi?`<div class="form-error">${esc(e.upi)}</div>`:''}
            </div>
          ` : S.payMethod==='card' ? `
            <div class="card-section">
              <div class="card-types">VISA · MASTERCARD · RUPAY · AMEX</div>
              <div class="form-group">
                <label class="form-label">Card Number</label>
                <input class="form-input${e.cardNum?' error':''}" type="text" placeholder="1234 5678 9012 3456" maxlength="19"
                  value="${esc(S.card.number)}"
                  oninput="S.card.number=fmtCard(this.value);this.value=S.card.number" />
                ${e.cardNum?`<div class="form-error">${esc(e.cardNum)}</div>`:''}
              </div>
              <div class="form-group">
                <label class="form-label">Name on Card</label>
                <input class="form-input${e.cardName?' error':''}" type="text" placeholder="As printed on card"
                  value="${esc(S.card.name)}" oninput="S.card.name=this.value" />
                ${e.cardName?`<div class="form-error">${esc(e.cardName)}</div>`:''}
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Expiry</label>
                  <input class="form-input${e.cardExp?' error':''}" type="text" placeholder="MM/YY" maxlength="5"
                    value="${esc(S.card.expiry)}"
                    oninput="S.card.expiry=fmtExp(this.value);this.value=S.card.expiry" />
                  ${e.cardExp?`<div class="form-error">${esc(e.cardExp)}</div>`:''}
                </div>
                <div class="form-group">
                  <label class="form-label">CVV</label>
                  <input class="form-input${e.cardCvv?' error':''}" type="password" placeholder="3–4 digits" maxlength="4"
                    value="${esc(S.card.cvv)}"
                    oninput="S.card.cvv=this.value.replace(/\\D/g,'').slice(0,4);this.value=S.card.cvv" />
                  ${e.cardCvv?`<div class="form-error">${esc(e.cardCvv)}</div>`:''}
                </div>
              </div>
            </div>
          ` : `
            <div class="cod-notice">
              <p>✓ &nbsp; Pay in cash when your order arrives. Our delivery partner will carry a receipt. Please keep exact change ready.</p>
            </div>
          `}
          <!-- DISCOUNT CODE -->
          <div style="margin-bottom:1.2rem;padding:1rem;background:var(--cream);border:1px solid var(--cream-dk);border-radius:8px">
            <label style="font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--brown-mid);font-weight:600;display:block;margin-bottom:0.5rem">Discount Code</label>
            <div style="display:flex;gap:0.5rem">
              <input type="text" id="discount-inp" placeholder="e.g. MELLOW15ABC"
                style="flex:1;padding:0.6rem 0.8rem;border:1px solid var(--cream-dk);background:var(--white);font-family:monospace;font-size:0.95rem;color:var(--brown);outline:none;border-radius:4px;text-transform:uppercase"
                oninput="this.value=this.value.toUpperCase()"
                onkeydown="if(event.key==='Enter'){applyDiscountCode(this.value)}" />
              <button onclick="applyDiscountCode(document.getElementById('discount-inp').value)"
                style="padding:0.6rem 1rem;background:var(--brown);color:var(--white);border:none;cursor:pointer;font-size:0.85rem;letter-spacing:0.05em;border-radius:4px;white-space:nowrap">
                Apply
              </button>
            </div>
            <div id="discount-result" style="margin-top:0.4rem;min-height:1.2em"></div>
          </div>

          <!-- Store hours warning (shown only when outside 10AM–10PM IST) -->
          <div id="store-closed-msg" style="display:none;background:#fff8e8;border:1px solid #c8a96e;border-radius:6px;padding:0.9rem 1.2rem;margin-bottom:1rem;color:#7a4f2a;font-size:0.92rem;text-align:center"></div>
          <script>
            (function(){
              var msg = document.getElementById('store-closed-msg');
              if (msg && typeof isStoreOpen === 'function' && !isStoreOpen()) {
                msg.style.display = 'block';
                msg.textContent   = '🕙 ' + (typeof openingTimeMessage === 'function' ? openingTimeMessage() : 'Orders available 10 AM – 10 PM IST only.');
              }
            })();
          </script>

          <div class="checkout-actions">
            <button class="btn-secondary" style="padding:1rem 1.5rem" onclick="S.checkStep=1;S.errors={};renderPage()">← Back</button>
            <button class="btn-primary" style="flex:1;padding:1rem;justify-content:center;${S.processing?'opacity:0.7;cursor:not-allowed':''}"
              onclick="${S.processing?'void(0)':'placeOrder()'}" ${S.processing?'disabled':''}>
              ${S.processing ? `<span class="processing-spinner"></span> Processing…` : `Place Order · ${fmt(grandTotal())}`}
            </button>
          </div>
          <p class="secure-note">🔒 256-bit SSL secured · Your payment info is safe</p>
        `}
      </div>

      <!-- ORDER SUMMARY -->
      <div class="order-summary">
        <p class="summary-title">Order Summary</p>
        <div class="summary-items">
          ${cartItems().map(p=>`
            <div class="summary-item">
              <div class="summary-thumb">
                <img src="${p.img}" alt="${esc(p.name)}" onerror="this.style.display='none'" loading="lazy"/>
              </div>
              <div style="flex:1">
                <div style="font-size:0.85rem;font-weight:600;color:${C.brown};font-family:'Playfair Display',serif">${esc(p.name)}</div>
                <div style="font-size:0.75rem;color:${C.brownLight}">Qty: ${S.cart[p.id]}</div>
              </div>
              <div style="font-family:'Playfair Display',serif;font-weight:700;color:${C.goldDark};font-size:0.88rem">${fmt(p.price*(S.cart[p.id]||0))}</div>
            </div>`).join('')}
        </div>
        <div class="summary-totals">
          ${[['Subtotal',fmt(subtotal())],['Delivery',delivery()===0?'FREE':fmt(delivery())],['GST (5%)',fmt(tax())]].map(([k,v])=>`
            <div class="summary-row">
              <span>${k}</span>
              <span${k==='Delivery'&&delivery()===0?` class="green-text"`:''} >${v}</span>
            </div>`).join('')}
          ${typeof DISCOUNT !== 'undefined' && DISCOUNT.valid ? `
          <div class="summary-row" style="color:#2d7a4a">
            <span>Discount (${DISCOUNT.percent}% off)</span>
            <span>-₹${DISCOUNT.amount.toLocaleString('en-IN')}</span>
          </div>` : ''}
          <div class="summary-grand"><span>Total</span><span id="checkout-total-display">${fmt(grandTotal())}</span></div>
          ${delivery()===0 ? `<p class="green-text" style="font-size:0.78rem;font-style:italic;margin-top:0.3rem">✓ Free delivery unlocked!</p>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

function handleFormInput(field, val) {
  S.form[field] = val;
}
function handleFormBlur() {
  // No re-render needed, state is already updated
}
function handleDeliveryContinue() {
  if(validateDelivery()) { saveDeliveryToLocal(); S.checkStep=2; renderPage(); window.scrollTo({top:0,behavior:'smooth'}); }
  else { renderPage(); }
}
function setPayMethod(m) {
  S.payMethod=m; S.errors={};
  const tabs = document.querySelectorAll('.pay-tab');
  tabs.forEach(t=>t.classList.toggle('active', t.textContent.trim().includes(m==='upi'?'UPI':m==='card'?'Card':'Cash')));
  // Re-render the payment section
  const payContent = document.querySelector('.checkout-wrap > div:last-child > div:first-child');
  renderPage();
}

/* ── SUCCESS VIEW ── */
function SuccessView() {
  const f = S.form;
  const payLabel = S.payMethod==='upi'?'UPI':S.payMethod==='card'?'Card':'Cash on Delivery';
  return `
  <div class="success-wrap">
    <div class="success-icon">🎉</div>
    <h2 class="sec-title" style="margin-bottom:0.8rem">Order Confirmed!</h2>
    <p style="font-size:1.1rem;color:${C.brownMid};font-style:italic;line-height:1.8;margin-bottom:2rem">
      Thank you, <strong>${esc(f.name)}</strong>! Your artisan Mexican desserts will arrive at <em>${esc(f.city)}, ${esc(f.state)}</em>.<br/>
      A confirmation was sent to <strong>${esc(f.email)}</strong>.
    </p>
    <div class="success-details">
      <span class="sec-eye" style="margin-bottom:0.6rem;display:block">Order Details</span>
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:${C.brown}">Order #MW${S.orderId||'00000'}</div>
      <div style="color:${C.brownMid};font-size:0.9rem;margin-top:0.3rem">Payment: ${payLabel}</div>
      <div style="color:${C.brownMid};font-size:0.9rem">Amount: <strong style="color:${C.goldDark}">${fmt(grandTotal())}</strong></div>
    </div>
    <button class="btn-primary" style="padding:1rem 2.5rem" onclick="S.cart={};S.storeView='store';S.checkStep=1;render()">← Continue Shopping</button>
  </div>`;
}

/* ── BLOG PAGE ── */
function BlogPage() {
  return `
  <div>
    <section style="background:${C.creamDark};padding:5rem 2.5rem;text-align:center;border-bottom:2px solid ${C.gold}">
      <span class="sec-eye">✦ &nbsp; The Mellow Journal &nbsp; ✦</span>
      <h1 class="sec-title">Stories, Recipes &amp; <em style="color:${C.goldDark};font-style:italic">Sweet Inspirations</em></h1>
      <p class="sec-sub">Dispatches from our kitchen — recipes, behind-the-scenes stories, and the couples who inspire us.</p>
    </section>

    <section class="blog-section">
      <div class="blog-grid">
        <div>
          <div class="blog-featured">
            <div class="blog-featured-img">
              <img src="${BLOG_FEATURED_IMAGE}" alt="Featured Post" onerror="this.style.display='none'" loading="lazy" />
            </div>
            <div class="blog-featured-body">
              <span class="sec-eye">✦ Featured</span>
              <h2 style="font-family:'Playfair Display',serif;font-size:1.7rem;font-weight:700;color:${C.brown};margin-bottom:0.7rem;line-height:1.2">
                The Secret Behind Our 48-Hour Flan
              </h2>
              <p style="font-size:1rem;line-height:1.75;color:${C.brownMid};font-style:italic;margin-bottom:1.2rem">
                Great things take time. Our flagship flan begins its journey two full days before it reaches your table — here is why patience is the most important ingredient.
              </p>
              <div style="font-family:'IM Fell English',serif;font-size:0.8rem;color:${C.brownLight};display:flex;gap:1rem;flex-wrap:wrap">
                <span>By Maria Vega</span><span>·</span><span>Nov 14, 2024</span><span>·</span><span>8 min read</span>
              </div>
            </div>
          </div>

          ${BLOG_POSTS.map(b=>`
            <div class="blog-post">
              <div class="blog-post-thumb">
                <img src="${b.img}" alt="${esc(b.tag)}" onerror="this.style.display='none'" loading="lazy" />
              </div>
              <div>
                <span class="sec-eye">${esc(b.tag)}</span>
                <div style="font-family:'Playfair Display',serif;font-weight:700;color:${C.brown};font-size:1rem;margin-bottom:0.2rem">${esc(b.title)}</div>
                <div style="font-family:'IM Fell English',serif;font-size:0.75rem;color:${C.brownLight}">${esc(b.date)}</div>
              </div>
            </div>`).join('')}
        </div>

        <div>
          <div class="blog-sidebar-widget">
            <h3 class="widget-title">Categories</h3>
            <ul class="cat-list">
              ${[['Recipes','12'],['Couples Stories','8'],['Behind the Scenes','5'],['New Arrivals','4'],['Traditions','9']].map(([c,n])=>`
                <li class="cat-item">
                  ${c}<span class="cat-badge">${n}</span>
                </li>`).join('')}
            </ul>
          </div>
          <div class="blog-sidebar-widget">
            <h3 class="widget-title">Newsletter</h3>
            <p style="font-size:0.88rem;color:${C.brownMid};margin-bottom:1rem;font-style:italic;line-height:1.6">Subscribe for seasonal recipes and stories.</p>
            <input class="form-input" id="blog-newsletter" type="email" placeholder="Your email…" style="margin-bottom:0.7rem"
              value="${esc(S.newsletter)}" oninput="S.newsletter=this.value" />
            <button class="btn-primary" style="width:100%;padding:0.7rem;justify-content:center"
              onclick="showToast('✦ Subscribed to the Mellow Journal!');S.newsletter='';document.getElementById('blog-newsletter').value=''">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </section>

    ${Footer()}
  </div>`;
}

/* ── CONTACT PAGE ── */
function ContactPage() {
  const cf = S.contactForm;
  return `
  <div>
    <section style="background:${C.white};padding:5rem 2.5rem;text-align:center;border-bottom:2px solid ${C.gold}">
      <span class="sec-eye">✦ &nbsp; Get in Touch &nbsp; ✦</span>
      <h1 class="sec-title">We'd Love to <em style="color:${C.goldDark};font-style:italic">Hear</em> from You</h1>
      <p class="sec-sub">Our team is dedicated to ensuring your experience with Mellow is always exceptional.</p>
    </section>

    <section style="padding:5rem 2.5rem;background:${C.cream}">
      <div class="contact-cards">
        ${[
          {icon:'📞',title:'Call Us',text:'Mon–Fri, 9am–6pm IST',detail:'1800-MELLOW-1'},
          {icon:'✉️',title:'Email Us',text:'Response within 24 hours',detail:'hello@mellowco.in'},
          {icon:'💬',title:'Live Chat',text:'Available weekdays',detail:'Start Chat'},
          {icon:'📍',title:'Head Office',text:'Coimbatore, Tamil Nadu',detail:'India'},
        ].map(c=>`
          <div class="contact-card">
            <div class="contact-card-icon">${c.icon}</div>
            <h3 class="contact-card-title">${c.title}</h3>
            <p class="contact-card-text">${c.text}</p>
            <p class="contact-card-detail">${c.detail}</p>
          </div>`).join('')}
      </div>

      <div style="max-width:640px;margin:0 auto">
        <div class="text-center" style="margin-bottom:2rem">
          <span class="sec-eye">Send a Message</span>
          <h2 class="sec-title">We're <em style="color:${C.goldDark};font-style:italic">Listening</em></h2>
        </div>
        <div class="contact-form-box">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Your Name</label>
              <input class="form-input" type="text" placeholder="Full Name"
                value="${esc(cf.name)}" oninput="S.contactForm.name=this.value" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" placeholder="you@example.com"
                value="${esc(cf.email)}" oninput="S.contactForm.email=this.value" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <select class="form-input" onchange="S.contactForm.subject=this.value">
              ${['General Enquiry','Product Information','Wholesale Partnerships','Feedback','Other'].map(o=>`<option${cf.subject===o?' selected':''}>${o}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Your Message</label>
            <textarea class="form-input" rows="5" style="resize:vertical" placeholder="Tell us how we can help…"
              oninput="S.contactForm.msg=this.value">${esc(cf.msg)}</textarea>
          </div>
          <button class="btn-primary" style="width:100%;padding:1rem;justify-content:center"
            onclick="handleContact()">
            Send Message ✦
          </button>
        </div>
      </div>
    </section>

    <section class="faq-section">
      <div class="text-center" style="margin-bottom:2.5rem">
        <span class="sec-eye">FAQ</span>
        <h2 class="sec-title">Frequently Asked <em style="color:${C.goldDark};font-style:italic">Questions</em></h2>
      </div>
      <div class="faq-list">
        ${[
          ['Where can I find Mellow desserts?','Mellow desserts are available at over 200 partner diners across India. Contact us to find the nearest location.'],
          ['Are your desserts made fresh?','Yes. Every Mellow dessert is crafted fresh using traditional methods. Our flan takes 48 hours. No preservatives or artificial flavourings.'],
          ['Can I become a partner diner?','We welcome enquiries from diners who share our values. Please contact us or email wholesale@mellowco.in.'],
          ['Do you cater to dietary restrictions?','Some desserts are gluten-free. Contact us for detailed allergen information for each product.'],
        ].map(([q,a])=>`
          <details>
            <summary>${q}</summary>
            <p>${a}</p>
          </details>`).join('')}
      </div>
    </section>

    ${NewsletterSection()}
    ${Footer()}
  </div>`;
}

async function handleContact() {
  const cf = S.contactForm;
  if (!cf.name.trim() || !cf.email.match(/^[^@]+@[^@]+\.[^@]+$/) || !cf.msg.trim()) {
    showToast('\u26a0 Please fill in all required fields.');
    return;
  }
  // Save feedback via API (works on localhost and Netlify)
  try {
    const res = await fetch(apiBase() + '/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cf.name, email: cf.email, subject: cf.subject, message: cf.msg }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'save failed');
  } catch(e) {
    console.warn('Feedback API error:', e.message);
    // Fallback: direct Supabase
    await client.from('feedback').insert([{
      name: cf.name, email: cf.email, subject: cf.subject, message: cf.msg,
    }]).catch(()=>{});
  }
  showToast('\u2756 Message received! We\'ll respond within 24 hours.');
  S.contactForm = {name:'',email:'',subject:'General Enquiry',msg:''};
  const box = document.querySelector('.contact-form-box');
  if(box) {
    box.querySelectorAll('input,textarea').forEach(el=>el.value='');
    const sel = box.querySelector('select');
    if(sel) sel.selectedIndex=0;
  }
}

/* ══════════════════════════════════════════════
   CART DRAWER
   ══════════════════════════════════════════════ */
function buildCart() {
  const items = cartItems();
  const cnt = cartCount();
  return `
    <div class="cart-header">
      <span class="cart-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Your Cart (${cnt})
      </span>
      <button class="cart-close" onclick="closeCart()">✕</button>
    </div>
    ${items.length===0 ? `
      <div class="cart-empty">
        <div class="cart-empty-icon">🍽️</div>
        Your cart is empty.<br/>Add some delicious treats!
      </div>
    ` : `
      <div class="cart-items">
        ${items.map(p=>`
          <div class="cart-item">
            <div class="cart-item-thumb">
              <img src="${p.img}" alt="${esc(p.name)}" onerror="this.style.display='none'" loading="lazy" />
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${esc(p.name)}</div>
              <div class="cart-item-price">${fmt(p.price)} × ${S.cart[p.id]} = ${fmt(p.price*(S.cart[p.id]||0))}</div>
            </div>
            <div class="qty-controls">
              <button class="qty-btn" onclick="decItem(${p.id})" style="width:26px;height:26px">−</button>
              <span class="qty-val" style="width:24px;font-size:0.9rem">${S.cart[p.id]}</span>
              <button class="qty-btn" onclick="addItem(${p.id})" style="width:26px;height:26px">+</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="cart-footer">
        ${[['Subtotal',fmt(subtotal())],['Delivery',delivery()===0?'FREE':fmt(delivery())],['GST (5%)',fmt(tax())]].map(([k,v])=>`
          <div class="cart-row">
            <span>${k}</span>
            <span${k==='Delivery'&&delivery()===0?` class="green-text"`:''} >${v}</span>
          </div>`).join('')}
        <div class="cart-total"><span>Total</span><span>${fmt(total())}</span></div>
        ${subtotal()>0&&subtotal()<999 ? `<p style="font-size:0.78rem;color:${C.brownLight};font-style:italic;margin-top:0.3rem">Add ${fmt(999-subtotal())} more for free delivery!</p>` : ''}
        ${delivery()===0 ? `<p class="green-text" style="font-size:0.78rem;font-style:italic;margin-top:0.3rem">✓ Free delivery unlocked!</p>` : ''}
        <button class="btn-primary" style="width:100%;padding:1rem;margin-top:1rem;justify-content:center"
          onclick="goCheckout()">Proceed to Checkout →</button>
      </div>
    `}
  `;
}


/* ══════════════════════════════════════════════════════════
   PROFILE PAGE — My Orders + Account Settings
   ══════════════════════════════════════════════════════════ */

/* State for orders list */
const PROFILE = {
  orders:       null,   // null = not loaded, [] = loaded empty, [...] = loaded
  ordersLoading: false,
  ordersError:   '',
};

async function loadMyOrders() {
  if (!AUTH.user) return;
  PROFILE.ordersLoading = true;
  PROFILE.ordersError   = '';
  renderPage();
  try {
    // Use server.py /api/my-orders — service role key bypasses RLS
    // so orders are always returned regardless of session state
    const res = await fetch(apiBase() + '/api/my-orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: AUTH.user.id }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error?.message || data.error || 'Failed to load orders');
    PROFILE.orders = data.orders || [];
  } catch(err) {
    PROFILE.ordersError = err.message;
    PROFILE.orders      = [];
  }
  PROFILE.ordersLoading = false;
  renderPage();
}

function ProfilePage() {
  if (!AUTH.user) {
    return `<div style="text-align:center;padding:6rem 2rem">
      <p style="color:${C.brownMid};font-size:1.1rem;margin-bottom:1.5rem">Please sign in to view your profile.</p>
      <button class="btn-primary" onclick="openAuth('login')">Sign In</button>
    </div>`;
  }

  const view        = S.profileView || 'orders';
  const displayName = AUTH.profile?.name || AUTH.user.email.split('@')[0];
  const initials    = displayName.slice(0, 2).toUpperCase();

  return `
  <div style="min-height:80vh;background:${C.cream};padding:2.5rem 1.5rem">
    <div style="max-width:900px;margin:0 auto">

      <!-- Profile Header -->
      <div style="background:${C.white};border:1px solid ${C.creamDark};border-top:3px solid ${C.gold};padding:2rem 2.5rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">
        <div style="width:64px;height:64px;border-radius:50%;background:${C.brown};color:${C.gold};display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:900;font-family:'Playfair Display',serif;flex-shrink:0">
          ${initials}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:1.4rem;font-weight:700;color:${C.brown};font-family:'Playfair Display',serif">${esc(displayName)}</div>
          <div style="font-size:0.9rem;color:${C.brownLight};margin-top:2px">${esc(AUTH.user.email)}</div>
          ${AUTH.profile?.phone ? `<div style="font-size:0.85rem;color:${C.brownLight};margin-top:2px">📱 ${esc(AUTH.profile.phone)}</div>` : ''}
        </div>
        <div style="font-size:0.8rem;color:${C.brownLight};font-style:italic">Member since ${new Date(AUTH.user.created_at).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;margin-bottom:1.5rem;border:1px solid ${C.creamDark};background:${C.white}">
        <button onclick="S.profileView='orders';renderPage()" style="flex:1;padding:0.9rem 1rem;border:none;cursor:pointer;font-size:0.9rem;font-family:'Cormorant Garamond',serif;letter-spacing:0.05em;background:${view==='orders'?C.brown:C.white};color:${view==='orders'?C.gold:C.brownMid};border-right:1px solid ${C.creamDark};transition:all 0.2s">
          🛒 &nbsp; My Orders
        </button>
        <button onclick="S.profileView='settings';renderPage()" style="flex:1;padding:0.9rem 1rem;border:none;cursor:pointer;font-size:0.9rem;font-family:'Cormorant Garamond',serif;letter-spacing:0.05em;background:${view==='settings'?C.brown:C.white};color:${view==='settings'?C.gold:C.brownMid};transition:all 0.2s">
          ⚙ &nbsp; Account Settings
        </button>
      </div>

      <!-- View Content -->
      ${view === 'orders' ? renderMyOrders() : renderAccountSettings()}

    </div>
  </div>`;
}

function renderMyOrders() {
  // Auto-load on first visit
  if (PROFILE.orders === null && !PROFILE.ordersLoading) {
    setTimeout(loadMyOrders, 0);
    return `<div style="text-align:center;padding:3rem;color:${C.brownLight}">Loading your orders…</div>`;
  }

  if (PROFILE.ordersLoading) {
    return `<div style="text-align:center;padding:3rem">
      <div style="width:36px;height:36px;border:3px solid ${C.creamDark};border-top-color:${C.gold};border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem"></div>
      <p style="color:${C.brownLight};font-style:italic">Fetching your orders…</p>
    </div>`;
  }

  if (PROFILE.ordersError) {
    return `<div style="background:${C.white};border:1px solid ${C.creamDark};padding:2rem;text-align:center">
      <p style="color:#8b1a1a;margin-bottom:1rem">Could not load orders: ${esc(PROFILE.ordersError)}</p>
      <button class="btn-secondary" style="padding:0.6rem 1.5rem;font-size:0.9rem" onclick="PROFILE.orders=null;loadMyOrders()">Try Again</button>
    </div>`;
  }

  if (!PROFILE.orders || PROFILE.orders.length === 0) {
    return `<div style="background:${C.white};border:1px solid ${C.creamDark};padding:4rem 2rem;text-align:center">
      <div style="font-size:3rem;margin-bottom:1rem">🍮</div>
      <h3 style="color:${C.brown};margin-bottom:0.8rem;font-family:'Playfair Display',serif">No orders yet</h3>
      <p style="color:${C.brownLight};font-style:italic;margin-bottom:1.5rem">Your order history will appear here after your first purchase.</p>
      <button class="btn-primary" style="padding:0.8rem 2rem" onclick="navigate('desserts')">Browse Desserts →</button>
    </div>`;
  }

  const statusColor = { confirmed:'#9d7a45', processing:'#185FA5', shipped:'#0F6E56', delivered:'#3B6D11', cancelled:'#8b1a1a' };
  const statusEmoji = { confirmed:'⏳', processing:'🔄', shipped:'🚚', delivered:'✅', cancelled:'❌' };

  return `
  <div style="display:flex;flex-direction:column;gap:1rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
      <span style="font-size:0.85rem;color:${C.brownLight}">${PROFILE.orders.length} order${PROFILE.orders.length===1?'':'s'} found</span>
      <button onclick="PROFILE.orders=null;loadMyOrders()" style="background:none;border:1px solid ${C.creamDark};padding:0.4rem 0.8rem;cursor:pointer;font-size:0.8rem;color:${C.brownMid};border-radius:4px">↺ Refresh</button>
    </div>
    ${PROFILE.orders.map(order => {
      const items  = order.items || [];
      const date   = new Date(order.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
      const st     = order.status || 'confirmed';
      const sc     = statusColor[st] || C.brownMid;
      const se     = statusEmoji[st]  || '⏳';
      const payLabel = order.payment_method==='upi'?'UPI':order.payment_method==='card'?'Card':'Cash on Delivery';
      return `
      <div style="background:${C.white};border:1px solid ${C.creamDark};border-left:3px solid ${C.gold}">
        <!-- Order Header -->
        <div style="padding:1rem 1.5rem;border-bottom:1px solid ${C.creamDark};display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem">
          <div>
            <div style="font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:${C.brown}">Order #${esc(order.order_id)}</div>
            <div style="font-size:0.82rem;color:${C.brownLight};margin-top:2px">${date} &nbsp;·&nbsp; ${payLabel}</div>
          </div>
          <div style="display:flex;align-items:center;gap:0.8rem">
            <span style="font-size:0.8rem;padding:3px 10px;background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:20px;font-weight:600">${se} ${st.charAt(0).toUpperCase()+st.slice(1)}</span>
            <span style="font-size:1rem;font-weight:700;color:${C.goldDark}">₹${Number(order.total).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <!-- Order Items -->
        <div style="padding:1rem 1.5rem">
          <div style="font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.6rem">Items</div>
          ${items.slice(0, 3).map(i => `
            <div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid ${C.creamDark};font-size:0.9rem">
              <span style="color:${C.brown}">${esc(i.name)} <span style="color:${C.brownLight}">×${i.qty}</span></span>
              <span style="color:${C.goldDark};font-weight:600">₹${Number(i.total).toLocaleString('en-IN')}</span>
            </div>`).join('')}
          ${items.length > 3 ? `<div style="font-size:0.82rem;color:${C.brownLight};padding-top:0.4rem;font-style:italic">+${items.length-3} more item${items.length-3===1?'':'s'}</div>` : ''}
        </div>
        <!-- Delivery + Totals -->
        <div style="padding:0.8rem 1.5rem;background:${C.cream};border-top:1px solid ${C.creamDark};display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.82rem;color:${C.brownLight}">
          <span>📍 ${esc(order.delivery_city||'')}, ${esc(order.delivery_state||'')}</span>
          <span style="color:${order.payment_status==='paid'?'#3B6D11':'#9d7a45'};font-weight:600">${order.payment_status==='paid'?'✅ Paid':'⏳ Payment Pending'}</span>
        </div>
        <!-- Download Invoice button -->
        <div style="padding:0.8rem 1.5rem;border-top:1px solid ${C.creamDark};display:flex;justify-content:flex-end;gap:0.8rem;flex-wrap:wrap">
          <button onclick="downloadOrderInvoice('${esc(order.order_id)}')"
            style="padding:0.5rem 1.2rem;background:${C.brown};color:#fffef8;border:1px solid ${C.gold};cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:0.88rem;border-radius:4px;letter-spacing:0.04em"
            onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            📄 Download Invoice
          </button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ── Download invoice for a past order (from My Orders list) ── */
function downloadOrderInvoice(orderId) {
  if (!PROFILE.orders) return;
  const order = PROFILE.orders.find(o => o.order_id === orderId);
  if (!order) { showToast('Order not found'); return; }
  // Pass order directly to downloadInvoice (defined in payment.js)
  if (typeof downloadInvoice === 'function') downloadInvoice(order);
  else showToast('Invoice function not available');
}


function renderAccountSettings() {
  const p = AUTH.profile || {};
  return `
  <div style="background:${C.white};border:1px solid ${C.creamDark};padding:2rem 2.5rem">
    <h3 style="font-family:'Playfair Display',serif;color:${C.brown};font-size:1.3rem;margin-bottom:1.5rem;padding-bottom:0.8rem;border-bottom:1px solid ${C.creamDark}">Profile Information</h3>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-bottom:1.5rem">
      <div>
        <div style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.4rem">Full Name</div>
        <input id="profile-name" type="text" value="${esc(p.name||'')}" placeholder="Enter your full name"
          style="width:100%;box-sizing:border-box;font-size:1rem;color:${C.brown};padding:0.6rem;background:${C.cream};border:1px solid ${C.creamDark};border-radius:4px;font-family:'Cormorant Garamond',serif;outline:none"
          onfocus="this.style.borderColor='${C.gold}'" onblur="this.style.borderColor='${C.creamDark}'" />
      </div>
      <div>
        <div style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.4rem">Email Address</div>
        <div style="font-size:1rem;color:${C.brownLight};padding:0.6rem;background:#f0ebe3;border:1px solid ${C.creamDark};border-radius:4px;cursor:not-allowed" title="Email cannot be changed">${esc(AUTH.user?.email||'—')}</div>
      </div>
      <div>
        <div style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.4rem">Mobile Number</div>
        <input id="profile-phone" type="tel" value="${esc(p.phone||'')}" placeholder="10-digit mobile number" maxlength="10"
          style="width:100%;box-sizing:border-box;font-size:1rem;color:${C.brown};padding:0.6rem;background:${C.cream};border:1px solid ${C.creamDark};border-radius:4px;font-family:'Cormorant Garamond',serif;outline:none"
          onfocus="this.style.borderColor='${C.gold}'" onblur="this.style.borderColor='${C.creamDark}'"
          oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)" />
      </div>
      <div>
        <div style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.4rem">Member Since</div>
        <div style="font-size:1rem;color:${C.brown};padding:0.6rem;background:${C.cream};border:1px solid ${C.creamDark};border-radius:4px">${new Date(AUTH.user?.created_at||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>
      </div>
    </div>

    <div id="profile-msg" style="display:none;padding:0.8rem 1rem;border-radius:4px;margin-bottom:1rem;font-size:0.9rem"></div>

    <button onclick="saveProfileChanges()"
      style="padding:0.75rem 2rem;background:${C.brown};color:#fffef8;border:none;cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:1rem;letter-spacing:0.05em;border-radius:4px;margin-bottom:1.5rem;transition:opacity 0.2s"
      onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
      ✦ Save Changes
    </button>

    <!-- Security Section: Change Email + Password -->
    <div style="border-top:1px solid ${C.creamDark};padding-top:1.5rem;margin-bottom:1.5rem">
      <h4 style="color:${C.brownMid};font-size:1rem;margin-bottom:1rem">Security</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
        <div>
          <div style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.4rem">New Email Address</div>
          <input id="new-email-inp" type="email" placeholder="Enter new email"
            style="width:100%;box-sizing:border-box;font-size:0.95rem;color:${C.brown};padding:0.55rem;background:${C.cream};border:1px solid ${C.creamDark};border-radius:4px;font-family:'Cormorant Garamond',serif;outline:none"
            onfocus="this.style.borderColor='${C.gold}'" onblur="this.style.borderColor='${C.creamDark}'" />
          <button onclick="changeEmail()"
            style="margin-top:0.5rem;padding:0.5rem 1.2rem;background:${C.brown};color:#fffef8;border:none;cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:0.9rem;border-radius:4px">
            Update Email
          </button>
        </div>
        <div>
          <div style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:${C.brownLight};margin-bottom:0.4rem">New Password</div>
          <input id="new-password-inp" type="password" placeholder="Min 6 characters"
            style="width:100%;box-sizing:border-box;font-size:0.95rem;color:${C.brown};padding:0.55rem;background:${C.cream};border:1px solid ${C.creamDark};border-radius:4px;font-family:'Cormorant Garamond',serif;outline:none"
            onfocus="this.style.borderColor='${C.gold}'" onblur="this.style.borderColor='${C.creamDark}'" />
          <button onclick="changePassword()"
            style="margin-top:0.5rem;padding:0.5rem 1.2rem;background:${C.brown};color:#fffef8;border:none;cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:0.9rem;border-radius:4px">
            Update Password
          </button>
        </div>
      </div>
      <div id="security-msg" style="display:none;margin-top:0.8rem;padding:0.7rem 1rem;border-radius:4px;font-size:0.9rem"></div>
    </div>

    <div style="border-top:1px solid ${C.creamDark};padding-top:1.5rem">
      <h4 style="color:${C.brownMid};font-size:1rem;margin-bottom:1rem">Quick Actions</h4>
      <div style="display:flex;gap:0.8rem;flex-wrap:wrap">
        <button class="btn-secondary" style="padding:0.7rem 1.4rem;font-size:0.9rem" onclick="navigate('desserts')">🛍 Shop Now</button>
        <button class="btn-secondary" style="padding:0.7rem 1.4rem;font-size:0.9rem" onclick="S.profileView='orders';renderPage()">🛒 View Orders</button>
        <button style="padding:0.7rem 1.4rem;font-size:0.9rem;background:none;border:1px solid #8b1a1a;color:#8b1a1a;cursor:pointer;font-family:'Cormorant Garamond',serif;border-radius:4px" onclick="handleLogout()">↩ Sign Out</button>
      </div>
    </div>
  </div>`;
}

async function changeEmail() {
  const newEmail = (document.getElementById('new-email-inp')?.value || '').trim();
  const msg      = document.getElementById('security-msg');
  if (!newEmail.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    _showSecMsg(msg, 'error', 'Please enter a valid email address.');
    return;
  }
  const btn = document.querySelector('button[onclick="changeEmail()"]');
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
  try {
    // Update email via Supabase Auth
    // Note: Supabase sends a confirmation link to the NEW email.
    // The change only takes effect after the user clicks that link.
    const { error } = await client.auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);

    // Log to user_credentials audit table (non-blocking)
    try {
      await fetch(apiBase() + '/api/update-credentials', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: AUTH.user?.id, email: newEmail, action: 'email' }),
      });
    } catch {}

    _showSecMsg(msg, 'success', '✅ Confirmation link sent to ' + newEmail + '. Click it to confirm the change.');
    document.getElementById('new-email-inp').value = '';
  } catch(err) {
    // Supabase requires SMTP to send the confirmation email.
    // On Netlify, client.auth.updateUser sends directly via Supabase's own email service —
    // this should work as long as Supabase email is enabled in your project.
    _showSecMsg(msg, 'error', 'Error: ' + err.message + '. Make sure email confirmations are enabled in your Supabase project (Auth → Settings → Enable email confirmations).');
  } finally {
    if (btn) { btn.textContent = 'Update Email'; btn.disabled = false; }
  }
}

async function changePassword() {
  const newPwd = (document.getElementById('new-password-inp')?.value || '');
  const msg    = document.getElementById('security-msg');
  if (newPwd.length < 6) {
    _showSecMsg(msg, 'error', 'Password must be at least 6 characters.');
    return;
  }
  const btn = document.querySelector('button[onclick="changePassword()"]');
  if (btn) { btn.textContent = 'Updating…'; btn.disabled = true; }
  try {
    const { error } = await client.auth.updateUser({ password: newPwd });
    if (error) throw new Error(error.message);

    // Log to user_credentials audit table (non-blocking)
    try {
      await fetch(apiBase() + '/api/update-credentials', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: AUTH.user?.id, email: AUTH.user?.email, action: 'password' }),
      });
    } catch {}

    _showSecMsg(msg, 'success', '✅ Password updated successfully!');
    document.getElementById('new-password-inp').value = '';
    showToast('✅ Password changed!');
  } catch(err) {
    _showSecMsg(msg, 'error', 'Error: ' + err.message);
  } finally {
    if (btn) { btn.textContent = 'Update Password'; btn.disabled = false; }
  }
}

function _showSecMsg(el, type, text) {
  if (!el) return;
  el.style.display  = 'block';
  el.style.background = type === 'success' ? '#f0fff4' : '#fff0f0';
  el.style.border     = type === 'success' ? '1px solid #a0d0b0' : '1px solid #e0a0a0';
  el.style.color      = type === 'success' ? '#1a5c35' : '#8b1a1a';
  el.textContent = text;
}

async function saveProfileChanges() {
  const name  = (document.getElementById('profile-name')?.value  || '').trim();
  const phone = (document.getElementById('profile-phone')?.value || '').trim();
  const msg   = document.getElementById('profile-msg');

  if (!name) {
    if (msg) { msg.style.display='block'; msg.style.background='#fff0f0'; msg.style.border='1px solid #e0a0a0'; msg.style.color='#8b1a1a'; msg.textContent='Please enter your full name.'; }
    return;
  }
  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    if (msg) { msg.style.display='block'; msg.style.background='#fff0f0'; msg.style.border='1px solid #e0a0a0'; msg.style.color='#8b1a1a'; msg.textContent='Please enter a valid 10-digit Indian mobile number.'; }
    return;
  }

  if (msg) msg.style.display='none';
  const btn = document.querySelector('button[onclick="saveProfileChanges()"]');
  if (btn) { btn.textContent='Saving…'; btn.disabled=true; }

  try {
    const res = await fetch(apiBase() + '/api/update-profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: AUTH.user?.id, name, phone }),
    });
    const data = await res.json();
    if (data.ok) {
      // Update local profile state
      if (!AUTH.profile) AUTH.profile = {};
      AUTH.profile.name  = data.profile?.name  || name;
      AUTH.profile.phone = data.profile?.phone || phone;
      if (msg) {
        msg.style.display='block';
        msg.style.background='#f0fff4';
        msg.style.border='1px solid #a0d0b0';
        msg.style.color='#1a5c35';
        msg.textContent='✅ Profile updated successfully!';
      }
      // Refresh nav to show new name
      renderNav();
      showToast('✅ Profile saved!');
    } else {
      throw new Error(data.error?.message || data.error || 'Update failed');
    }
  } catch(err) {
    if (msg) { msg.style.display='block'; msg.style.background='#fff0f0'; msg.style.border='1px solid #e0a0a0'; msg.style.color='#8b1a1a'; msg.textContent='Error: ' + err.message; }
  } finally {
    if (btn) { btn.textContent='✦ Save Changes'; btn.disabled=false; }
  }
}

/* ══════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════ */
function renderNav() {
  const nav = document.getElementById('nav');
  if(nav) nav.innerHTML = buildNav();

  const mobileNav = document.getElementById('mobile-nav');
  if(mobileNav) mobileNav.innerHTML = buildMobileNav();
}

function renderCart() {
  const drawer = document.getElementById('cart-drawer');
  if(drawer) drawer.innerHTML = buildCart();
}

function renderPage() {
  const main = document.getElementById('main');
  if(!main) return;
  let html = '';
  switch(S.page) {
    case 'home':     html = HomePage(); break;
    case 'about':    html = AboutPage(); break;
    case 'desserts': html = DessertsPage(); break;
    case 'blog':     html = BlogPage(); break;
    case 'contact':  html = ContactPage(); break;
    case 'profile':  html = ProfilePage(); break;
    default:         html = HomePage();
  }
  main.innerHTML = html;
}

function render() {
  renderNav();
  renderPage();
  renderCart();
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Restore page from URL hash on refresh
  const validPages = ['home', 'about', 'desserts', 'blog', 'contact', 'profile'];
  const hash = window.location.hash.replace('#', '');
  if (hash && validPages.includes(hash)) {
    S.page = hash;
    if (hash === 'desserts') { S.storeView = 'store'; S.checkStep = 1; }
  }
  render();
});

// Close mobile menu on outside click
document.addEventListener('click', e => {
  if(S.navOpen && !e.target.closest('.nav-mobile-menu') && !e.target.closest('.nav-hamburger')) {
    S.navOpen = false;
    renderNav();
  }
});

// Handle keyboard escape for cart
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && S.cartOpen) closeCart();
});