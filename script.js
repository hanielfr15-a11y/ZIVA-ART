/* =========================================================
   ZIVA ART - PRODUTOS (COM IMAGEM E CORAÇÃO)
   ========================================================= */

const products = [
    { id: 1, name: "Dragon Red Concept", cat: "Interclasse", price: 14.99, old: 55, img: "assets/img/teste.jpg" },
    { id: 2, name: "Pantera Black", cat: "Mascotes", price: 12.99, old: 45, img: "assets/img/teste.jpg" },
    { id: 3, name: "Wolf Red Elite", cat: "Interclasse", price: 15.99, old: 55, img: "assets/img/teste.jpg" },
    { id: 4, name: "Fenix Concept", cat: "Mascotes", price: 14.99, old: 50, img: "assets/img/teste.jpg" },
    { id: 5, name: "Jersey Sport", cat: "Esportivo", price: 11.99, old: 40, img: "assets/img/teste.jpg" },
    { id: 6, name: "Typography X", cat: "Vetores", price: 9.99, old: 35, img: "assets/img/teste.jpg" },
    { id: 7, name: "Brasil Concept", cat: "Interclasse", price: 13.99, old: 45, img: "assets/img/teste.jpg" },
    { id: 8, name: "Lion Gold", cat: "Mascotes", price: 16.99, old: 60, img: "assets/img/teste.jpg" }
];

/* --- FORMATAÇÃO DE PREÇO --- */
const money = (val) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* --- MOSTRAR PRODUTOS NA TELA --- */
function renderProducts(list = products) {
    const container = document.getElementById("products");
    const countLabel = document.getElementById("catalogResults");

    if (!container) return;

    // Atualiza o texto de contagem (Há X resultados...)
    if (countLabel) {
        countLabel.innerText = `Há ${list.length} resultados no total`;
    }

    container.innerHTML = list.map((p) => `
        <article class="product">
            <div class="product-img">
                <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/1000x1000?text=ZIVA+ART'">
                <button class="wishlist-btn" onclick="event.stopPropagation(); toggleFav(this)">
                    <i class="fa-regular fa-heart"></i>
                </button>
                <span class="tag">-${Math.round((1 - p.price / p.old) * 100)}%</span>
            </div>
            <div class="product-info">
                <small>${p.cat}</small>
                <h3>${p.name}</h3>
                <div class="price">
                    <strong>${money(p.price)}</strong>
                    <del>${money(p.old)}</del>
                </div>
                <button class="add" onclick="addCart(${p.id})">Adicionar ao carrinho</button>
            </div>
        </article>
    `).join("");
}

/* --- FUNÇÃO FAVORITOS (CORAÇÃO) --- */
function toggleFav(btn) {
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    const favCount = document.getElementById('favCount');
    let count = parseInt(favCount.innerText) || 0;

    if (btn.classList.contains('active')) {
        icon.classList.replace('fa-regular', 'fa-solid');
        favCount.innerText = count + 1;
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        favCount.innerText = count - 1;
    }
}

/* --- CARRINHO --- */
let cart = JSON.parse(localStorage.getItem("zivaCart") || "[]");

function save() {
    localStorage.setItem("zivaCart", JSON.stringify(cart));
    renderCart();
    const countEl = document.querySelector("#cartCount");
    if(countEl) countEl.textContent = cart.reduce((t, i) => t + i.qty, 0);
}

function addCart(id) {
    const found = cart.find(i => i.id === id);
    if (found) found.qty++; else cart.push({ id, qty: 1 });
    save(); openCart();
}

function renderCart() {
    const el = document.querySelector("#cartItems");
    if (!el) return;
    if (!cart.length) {
        el.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>';
        document.querySelector("#cartTotal").textContent = money(0);
        return;
    }
    let total = 0;
    el.innerHTML = cart.map(item => {
        const p = products.find(prod => prod.id === item.id);
        if(!p) return "";
        total += p.price * item.qty;
        return `<div class="cart-item">
            <div class="mini" style="background-image:url(${p.img});background-size:cover"></div>
            <div><h4>${p.name}</h4><span>${item.qty} × ${money(p.price)}</span></div>
            <button style="margin-left:auto;background:none;border:0;color:#666;" onclick="removeCart(${item.id})">×</button>
        </div>`;
    }).join("");
    document.querySelector("#cartTotal").textContent = money(total);
}

function removeCart(id) { cart = cart.filter(i => i.id !== id); save(); }
function openCart() { document.querySelector("#cart")?.classList.add("open"); document.querySelector("#overlay")?.classList.add("open"); }
function closeCart() { document.querySelector("#cart")?.classList.remove("open"); document.querySelector("#overlay")?.classList.remove("open"); }

/* --- EVENTOS --- */
document.addEventListener("DOMContentLoaded", () => {
    // Abrir/Fechar Carrinho
    document.querySelector("#cartBtn").onclick = openCart;
    document.querySelector("#closeCart").onclick = closeCart;
    document.querySelector("#overlay").onclick = closeCart;

    // Modal Login
    const userBtn = document.getElementById('userBtn');
    const loginModal = document.getElementById('loginModal');
    if (userBtn && loginModal) userBtn.onclick = () => loginModal.classList.add('open');
    if (document.getElementById('closeLogin')) document.getElementById('closeLogin').onclick = () => loginModal.classList.remove('open');

    // Busca
    const searchIn = document.getElementById('searchInput');
    if (searchIn) {
        searchIn.oninput = () => {
            const query = searchIn.value.toLowerCase();
            const filtered = products.filter(p => p.name.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query));
            renderProducts(filtered);
        };
    }

    // Inicializa site
    renderProducts();
    save();
    
    // Loader
    setTimeout(() => {
        document.body.classList.add("ziva-loaded");
        document.getElementById("zivaLoader")?.classList.add("hide");
    }, 600);
});
