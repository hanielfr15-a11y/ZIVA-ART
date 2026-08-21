/* =========================================================
   ZIVA ART - CONFIGURAÇÕES E PRODUTOS
   ========================================================= */

const products = [
    {
        id: 1,
        name: "Dragon Red Concept",
        cat: "Interclasse",
        price: 14.99,
        old: 55,
        img: "assets/img/teste.jpg" // CAMINHO DA SUA IMAGEM
    },
    {
        id: 2,
        name: "Pantera Black",
        cat: "Mascotes",
        price: 12.99,
        old: 45,
        img: "assets/img/teste.jpg"
    },
    {
        id: 3,
        name: "Wolf Red Elite",
        cat: "Interclasse",
        price: 15.99,
        old: 55,
        img: "assets/img/teste.jpg"
    },
    {
        id: 4,
        name: "Fenix Concept",
        cat: "Mascotes",
        price: 14.99,
        old: 50,
        img: "assets/img/teste.jpg"
    },
    {
        id: 5,
        name: "Jersey Sport",
        cat: "Esportivo",
        price: 11.99,
        old: 40,
        img: "assets/img/teste.jpg"
    },
    {
        id: 6,
        name: "Typography X",
        cat: "Vetores",
        price: 9.99,
        old: 35,
        img: "assets/img/teste.jpg"
    },
    {
        id: 7,
        name: "Brasil Concept",
        cat: "Interclasse",
        price: 13.99,
        old: 45,
        img: "assets/img/teste.jpg"
    },
    {
        id: 8,
        name: "Lion Gold",
        cat: "Mascotes",
        price: 16.99,
        old: 60,
        img: "assets/img/teste.jpg"
    }
];

/* =========================================================
   RENDERIZAR PRODUTOS NA TELA
   ========================================================= */

function renderProducts(list = products) {
    const container = document.querySelector("#products");
    if (!container) return;

    container.innerHTML = list.map((p) => {
        return `
            <article class="product">
                <div class="product-img">
                    <!-- IMAGEM DO PRODUTO -->
                    <img src="${p.img}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
                    
                    <!-- BOTÃO CORAÇÃO (FAVORITOS) -->
                    <button class="wishlist-btn" onclick="event.stopPropagation(); toggleFav(this)">
                        <i class="fa-regular fa-heart"></i>
                    </button>

                    <span class="tag">
                        - ${Math.round((1 - p.price / p.old) * 100)}%
                    </span>
                </div>

                <div class="product-info">
                    <small>${p.cat}</small>
                    <h3>${p.name}</h3>
                    <div class="price">
                        <strong>${money(p.price)}</strong>
                        <del>${money(p.old)}</del>
                    </div>
                    <button class="add" onclick="addCart(${p.id})">
                        Adicionar ao carrinho
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

/* --- FUNÇÃO PARA FAVORITAR (CORAÇÃO) --- */
function toggleFav(btn) {
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    const favCountElement = document.getElementById('favCount');
    
    let currentCount = parseInt(favCountElement.innerText) || 0;

    if (btn.classList.contains('active')) {
        icon.classList.replace('fa-regular', 'fa-solid');
        favCountElement.innerText = currentCount + 1;
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        favCountElement.innerText = currentCount - 1;
    }
}

/* =========================================================
   CARRINHO E FORMATAÇÃO (MANTIDO)
   ========================================================= */

let cart = JSON.parse(localStorage.getItem("zivaCart") || "[]");

const money = (value) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

function save() {
    localStorage.setItem("zivaCart", JSON.stringify(cart));
    renderCart();
    const count = cart.reduce((total, item) => total + item.qty, 0);
    document.querySelector("#cartCount").textContent = count;
}

function addCart(id) {
    const found = cart.find((item) => item.id === id);
    if (found) { found.qty++; } else { cart.push({ id, qty: 1 }); }
    save();
    openCart();
}

function renderCart() {
    const element = document.querySelector("#cartItems");
    if (!element) return;
    if (!cart.length) {
        element.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>';
        document.querySelector("#cartTotal").textContent = money(0);
        return;
    }
    let total = 0;
    element.innerHTML = cart.map((item) => {
        const product = products.find((p) => p.id === item.id);
        total += product.price * item.qty;
        return `
            <div class="cart-item">
                <div class="mini" style="background-image:url(${product.img}); background-size:cover;"></div>
                <div>
                    <h4>${product.name}</h4>
                    <span>${item.qty} × ${money(product.price)}</span>
                </div>
                <button style="margin-left:auto; background:none; border:0; color:#666; cursor:pointer" onclick="removeCart(${product.id})">×</button>
            </div>
        `;
    }).join("");
    document.querySelector("#cartTotal").textContent = money(total);
}

function removeCart(id) {
    cart = cart.filter((item) => item.id !== id);
    save();
}

function openCart() {
    document.querySelector("#cart").classList.add("open");
    document.querySelector("#overlay").classList.add("open");
}

function closeCart() {
    document.querySelector("#cart").classList.remove("open");
    document.querySelector("#overlay").classList.remove("open");
}

/* =========================================================
   LOGICA DE MODAIS E BUSCA
   ========================================================= */

// Modal Login
const loginModal = document.getElementById('loginModal');
const userBtn = document.getElementById('userBtn');
const closeLogin = document.getElementById('closeLogin');

if (userBtn) userBtn.onclick = () => loginModal.classList.add('open');
if (closeLogin) closeLogin.onclick = () => loginModal.classList.remove('open');

// Busca no Topo
const searchInputHeader = document.getElementById('searchInput');
if (searchInputHeader) {
    searchInputHeader.oninput = () => {
        const query = searchInputHeader.value.toLowerCase();
        const filtered = products.filter(p => p.name.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query));
        renderProducts(filtered);
    };
}

/* =========================================================
   INICIALIZAÇÃO FINAL
   ========================================================= */

window.addEventListener("load", () => {
    const loader = document.getElementById("zivaLoader");
    setTimeout(() => {
        document.body.classList.add("ziva-loaded");
        if (loader) loader.classList.add("hide");
    }, 650);
});

renderProducts();
save();
