const products=[
 {id:1,name:'Dragon Red Concept',cat:'Interclasse',price:14.99,old:55},
 {id:2,name:'Pantera Black',cat:'Mascotes',price:12.99,old:45},
 {id:3,name:'Wolf Red Elite',cat:'Interclasse',price:15.99,old:55},
 {id:4,name:'Fenix Concept',cat:'Mascotes',price:14.99,old:50},
 {id:5,name:'Jersey Sport',cat:'Esportivo',price:11.99,old:40},
 {id:6,name:'Typography X',cat:'Vetores',price:9.99,old:35},
 {id:7,name:'Brasil Concept',cat:'Interclasse',price:13.99,old:45},
 {id:8,name:'Lion Gold',cat:'Mascotes',price:16.99,old:60}
];
let cart=JSON.parse(localStorage.getItem('zivaCart')||'[]');
const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function renderProducts(list=products){document.querySelector('#products').innerHTML=list.map(p=>`<article class="product"><div class="product-img"><span class="tag">- ${Math.round((1-p.price/p.old)*100)}%</span></div><div class="product-info"><small>${p.cat}</small><h3>${p.name}</h3><div class="price"><strong>${money(p.price)}</strong><del>${money(p.old)}</del></div><button class="add" onclick="addCart(${p.id})">Adicionar ao carrinho</button></div></article>`).join('')}
function save(){localStorage.setItem('zivaCart',JSON.stringify(cart));renderCart();document.querySelector('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0)}
function addCart(id){const p=products.find(x=>x.id===id), found=cart.find(x=>x.id===id);if(found)found.qty++;else cart.push({id,qty:1});save();openCart()}
function renderCart(){const el=document.querySelector('#cartItems');if(!cart.length){el.innerHTML='<p class="empty">Seu carrinho está vazio.</p>';document.querySelector('#cartTotal').textContent=money(0);return}let total=0;el.innerHTML=cart.map(x=>{const p=products.find(q=>q.id===x.id);total+=p.price*x.qty;return `<div class="cart-item"><div class="mini"></div><div><h4>${p.name}</h4><span>${x.qty} × ${money(p.price)}</span></div><button style="margin-left:auto;background:none;border:0;color:#666;cursor:pointer" onclick="removeCart(${p.id})">×</button></div>`}).join('');document.querySelector('#cartTotal').textContent=money(total)}
function removeCart(id){cart=cart.filter(x=>x.id!==id);save()}
function openCart(){document.querySelector('#cart').classList.add('open');document.querySelector('#overlay').classList.add('open')}
function closeCart(){document.querySelector('#cart').classList.remove('open');document.querySelector('#overlay').classList.remove('open')}
document.querySelector('#cartBtn').onclick=openCart;document.querySelector('#closeCart').onclick=closeCart;document.querySelector('#overlay').onclick=closeCart;document.querySelector('#checkoutBtn').onclick=()=>alert('Checkout será conectado ao seu gateway de pagamento na próxima etapa.');
const modal=document.querySelector('#searchModal'), input=document.querySelector('#searchInput');document.querySelector('#searchBtn').onclick=()=>{modal.classList.add('open');input.focus()};document.querySelector('#closeSearch').onclick=()=>modal.classList.remove('open');input.oninput=()=>{const q=input.value.toLowerCase();const r=products.filter(p=>(p.name+' '+p.cat).toLowerCase().includes(q));document.querySelector('#searchResults').innerHTML=r.length?r.map(p=>`<div style="padding:13px 0;border-bottom:1px solid #222;font-size:11px">${p.name} <span style="color:#777">${money(p.price)}</span></div>`).join(''):'<p style="color:#666;font-size:11px">Nenhuma arte encontrada.</p>'};
document.querySelectorAll('.cat').forEach(c=>c.onclick=e=>{const cat=c.dataset.cat;if(cat){e.preventDefault();renderProducts(products.filter(p=>p.cat===cat));document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'})}});
renderProducts();save();
