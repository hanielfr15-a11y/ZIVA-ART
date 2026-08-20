/* =========================================================
   ZIVA ART - LOADER
   ========================================================= */

window.addEventListener("load", () => {

    const loader = document.getElementById("zivaLoader");

    setTimeout(() => {

        document.body.classList.add("ziva-loaded");

        if (loader) {
            loader.classList.add("hide");
        }

    }, 650);

});


/* =========================================================
   PRODUTOS
   ========================================================= */

const products = [
    {
        id: 1,
        name: "Dragon Red Concept",
        cat: "Interclasse",
        price: 14.99,
        old: 55
    },
    {
        id: 2,
        name: "Pantera Black",
        cat: "Mascotes",
        price: 12.99,
        old: 45
    },
    {
        id: 3,
        name: "Wolf Red Elite",
        cat: "Interclasse",
        price: 15.99,
        old: 55
    },
    {
        id: 4,
        name: "Fenix Concept",
        cat: "Mascotes",
        price: 14.99,
        old: 50
    },
    {
        id: 5,
        name: "Jersey Sport",
        cat: "Esportivo",
        price: 11.99,
        old: 40
    },
    {
        id: 6,
        name: "Typography X",
        cat: "Vetores",
        price: 9.99,
        old: 35
    },
    {
        id: 7,
        name: "Brasil Concept",
        cat: "Interclasse",
        price: 13.99,
        old: 45
    },
    {
        id: 8,
        name: "Lion Gold",
        cat: "Mascotes",
        price: 16.99,
        old: 60
    }
];


/* =========================================================
   CARRINHO
   ========================================================= */

let cart = JSON.parse(
    localStorage.getItem("zivaCart") || "[]"
);


/* =========================================================
   FORMATAÇÃO DE PREÇO
   ========================================================= */

const money = (value) => {

    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

};


/* =========================================================
   PRODUTOS NA TELA
   ========================================================= */

function renderProducts(list = products) {

    document.querySelector("#products").innerHTML = list.map((p) => {

        return `
            <article class="product">

                <div class="product-img">

                    <span class="tag">
                        - ${Math.round((1 - p.price / p.old) * 100)}%
                    </span>

                </div>

                <div class="product-info">

                    <small>${p.cat}</small>

                    <h3>${p.name}</h3>

                    <div class="price">

                        <strong>
                            ${money(p.price)}
                        </strong>

                        <del>
                            ${money(p.old)}
                        </del>

                    </div>

                    <button
                        class="add"
                        onclick="addCart(${p.id})"
                    >
                        Adicionar ao carrinho
                    </button>

                </div>

            </article>
        `;

    }).join("");

}


/* =========================================================
   SALVAR CARRINHO
   ========================================================= */

function save() {

    localStorage.setItem(
        "zivaCart",
        JSON.stringify(cart)
    );

    renderCart();

    document.querySelector("#cartCount").textContent =
        cart.reduce((total, item) => total + item.qty, 0);

}


/* =========================================================
   ADICIONAR AO CARRINHO
   ========================================================= */

function addCart(id) {

    const product = products.find(
        (item) => item.id === id
    );

    const found = cart.find(
        (item) => item.id === id
    );

    if (found) {

        found.qty++;

    } else {

        cart.push({
            id,
            qty: 1
        });

    }

    save();

    openCart();

}


/* =========================================================
   MOSTRAR CARRINHO
   ========================================================= */

function renderCart() {

    const element =
        document.querySelector("#cartItems");

    if (!cart.length) {

        element.innerHTML =
            '<p class="empty">Seu carrinho está vazio.</p>';

        document.querySelector("#cartTotal").textContent =
            money(0);

        return;
    }

    let total = 0;

    element.innerHTML = cart.map((item) => {

        const product = products.find(
            (product) => product.id === item.id
        );

        total += product.price * item.qty;

        return `
            <div class="cart-item">

                <div class="mini"></div>

                <div>

                    <h4>${product.name}</h4>

                    <span>
                        ${item.qty} × ${money(product.price)}
                    </span>

                </div>

                <button
                    style="
                        margin-left:auto;
                        background:none;
                        border:0;
                        color:#666;
                        cursor:pointer
                    "
                    onclick="removeCart(${product.id})"
                >
                    ×
                </button>

            </div>
        `;

    }).join("");

    document.querySelector("#cartTotal").textContent =
        money(total);

}


/* =========================================================
   REMOVER DO CARRINHO
   ========================================================= */

function removeCart(id) {

    cart = cart.filter(
        (item) => item.id !== id
    );

    save();

}


/* =========================================================
   ABRIR CARRINHO
   ========================================================= */

function openCart() {

    document
        .querySelector("#cart")
        .classList.add("open");

    document
        .querySelector("#overlay")
        .classList.add("open");

}


/* =========================================================
   FECHAR CARRINHO
   ========================================================= */

function closeCart() {

    document
        .querySelector("#cart")
        .classList.remove("open");

    document
        .querySelector("#overlay")
        .classList.remove("open");

}


/* =========================================================
   EVENTOS DO CARRINHO
   ========================================================= */

document.querySelector("#cartBtn").onclick = openCart;

document.querySelector("#closeCart").onclick = closeCart;

document.querySelector("#overlay").onclick = closeCart;

document.querySelector("#checkoutBtn").onclick = () => {

    alert(
        "Checkout será conectado ao seu gateway de pagamento na próxima etapa."
    );

};


/* =========================================================
   BUSCA
   ========================================================= */

const modal =
    document.querySelector("#searchModal");

const input =
    document.querySelector("#searchInput");


document.querySelector("#searchBtn").onclick = () => {

    modal.classList.add("open");

    input.focus();

};


document.querySelector("#closeSearch").onclick = () => {

    modal.classList.remove("open");

};


input.oninput = () => {

    const query =
        input.value.toLowerCase();

    const results =
        products.filter((product) => {

            return (
                product.name +
                " " +
                product.cat
            )
                .toLowerCase()
                .includes(query);

        });

    document.querySelector("#searchResults").innerHTML =
        results.length

            ? results.map((product) => {

                return `
                    <div
                        style="
                            padding:13px 0;
                            border-bottom:1px solid #222;
                            font-size:11px
                        "
                    >

                        ${product.name}

                        <span style="color:#777">
                            ${money(product.price)}
                        </span>

                    </div>
                `;

            }).join("")

            : `
                <p
                    style="
                        color:#666;
                        font-size:11px
                    "
                >
                    Nenhuma arte encontrada.
                </p>
            `;

};


/* =========================================================
   FILTRO DAS CATEGORIAS
   ========================================================= */

document.querySelectorAll(".cat").forEach((category) => {

    category.onclick = (event) => {

        const cat =
            category.dataset.cat;

        if (cat) {

            event.preventDefault();

            renderProducts(
                products.filter(
                    (product) =>
                        product.cat === cat
                )
            );

            document
                .querySelector("#catalogo")
                .scrollIntoView({
                    behavior: "smooth"
                });

        }

    };

});


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

renderProducts();

save();


/* =========================================================
   ZIVA ART - BOTÃO MAGNÉTICO
   ========================================================= */

function initMagneticButtons() {

    const buttons =
        document.querySelectorAll(".btn");


    buttons.forEach((button) => {

        button.addEventListener(
            "mousemove",
            (event) => {

                const rect =
                    button.getBoundingClientRect();


                const x =
                    event.clientX - rect.left;

                const y =
                    event.clientY - rect.top;


                const centerX =
                    rect.width / 2;

                const centerY =
                    rect.height / 2;


                /*
                 * Movimento horizontal.
                 * 0.10 = movimento sutil.
                 */
                const moveX =
                    (x - centerX) * 0.10;


                /*
                 * Movimento vertical.
                 */
                const moveY =
                    (y - centerY) * 0.10;


                button.style.setProperty(
                    "--mouse-x",
                    `${moveX}px`
                );

                button.style.setProperty(
                    "--mouse-y",
                    `${moveY}px`
                );

            }
        );


        button.addEventListener(
            "mouseleave",
            () => {

                button.style.setProperty(
                    "--mouse-x",
                    "0px"
                );

                button.style.setProperty(
                    "--mouse-y",
                    "0px"
                );

            }
        );

    });

}


initMagneticButtons();
/* =========================================================
   ZIVA ART - CONTADORES
   ========================================================= */

function animateCounter(element) {

    const target = Number(element.dataset.target);
    const suffix = element.dataset.suffix || "";
    const duration = 2800;

    let startTime = null;

    function update(currentTime) {

        if (!startTime) {
            startTime = currentTime;
        }

        const progress = Math.min(
            (currentTime - startTime) / duration,
            1
        );

        const eased =
            1 - Math.pow(1 - progress, 3);

        const value = Math.floor(target * eased);

        element.textContent =
            value.toLocaleString("pt-BR") + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent =
                target.toLocaleString("pt-BR") + suffix;
        }
    }

    requestAnimationFrame(update);
}


function initCounters() {

    const stats = document.querySelector(".stats");

    if (!stats) return;

    const counters =
        stats.querySelectorAll("strong[data-target]");

    if (!counters.length) return;

    let started = false;

    const observer = new IntersectionObserver(
        (entries) => {

            if (
                entries[0].isIntersecting &&
                !started
            ) {

                started = true;

                counters.forEach((counter, index) => {

                    setTimeout(() => {
                        animateCounter(counter);
                    }, index * 180);

                });

                observer.disconnect();
            }

        },
        {
            threshold: 0.3
        }
    );

    observer.observe(stats);
}


initCounters();
/* =========================================================
   ZIVA ART - FILTRO DO CATÁLOGO
   ========================================================= */

function initCatalogControls() {

    const filterButton =
        document.querySelector("#catalogFilterBtn");

    const filterPanel =
        document.querySelector("#catalogFilters");

    const resultsText =
        document.querySelector("#catalogResults");

    const sortSelect =
        document.querySelector("#catalogSort");

    const productsContainer =
        document.querySelector("#products");


    if (
        !filterButton ||
        !filterPanel ||
        !resultsText ||
        !sortSelect ||
        !productsContainer
    ) {
        return;
    }


    let closeTimer = null;


    /* CONTADOR */

    function updateCatalogResults(list) {

        const total =
            Array.isArray(list)
                ? list.length
                : productsContainer.querySelectorAll(".product").length;


        resultsText.textContent =
            `Há ${total} resultados no total`;

    }


    /* FILTRAR */

    function showCategory(category) {

        if (category === "all") {

            renderProducts(products);

            updateCatalogResults(products);

        } else {

            const filtered =
                products.filter(
                    (product) =>
                        product.cat === category
                );

            renderProducts(filtered);

            updateCatalogResults(filtered);

        }

    }


    /* ABRIR FILTRO */

    function openFilter() {

        if (closeTimer) {
            clearTimeout(closeTimer);
        }

        filterPanel.classList.add("open");

    }


    /* FECHAR FILTRO */

    function scheduleCloseFilter() {

        if (closeTimer) {
            clearTimeout(closeTimer);
        }

        closeTimer = setTimeout(() => {

            filterPanel.classList.remove("open");

        }, 180);

    }


    /* MOUSE NO BOTÃO */

    filterButton.addEventListener(
        "mouseenter",
        openFilter
    );


    filterButton.addEventListener(
        "mouseleave",
        scheduleCloseFilter
    );


    /* MOUSE NO MENU */

    filterPanel.addEventListener(
        "mouseenter",
        openFilter
    );


    filterPanel.addEventListener(
        "mouseleave",
        scheduleCloseFilter
    );


    /* SELECIONAR CATEGORIA */

    filterPanel
        .querySelectorAll(".filter-option")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const category =
                        button.dataset.filter || "all";


                    filterPanel
                        .querySelectorAll(".filter-option")
                        .forEach((item) => {

                            item.classList.remove("active");

                        });


                    button.classList.add("active");


                    showCategory(category);


                    filterPanel.classList.remove("open");

                }
            );

        });


    /* ORDENAÇÃO */

    sortSelect.addEventListener(
        "change",
        () => {

            const value =
                sortSelect.value;


            let sorted =
                [...products];


            if (value === "low") {

                sorted.sort(
                    (a, b) =>
                        a.price - b.price
                );

            }


            if (value === "high") {

                sorted.sort(
                    (a, b) =>
                        b.price - a.price
                );

            }


            if (value === "recent") {

                sorted.sort(
                    (a, b) =>
                        b.id - a.id
                );

            }


            if (value === "default") {

                sorted = [...products];

            }


            renderProducts(sorted);

            updateCatalogResults(sorted);

        }
    );


    updateCatalogResults(products);

}


/* INICIAR */

initCatalogControls();
