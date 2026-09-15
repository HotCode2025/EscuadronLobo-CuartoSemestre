const modalContainer = document.getElementById("modal-container");
const modalOverlay = document.getElementById("modal-overlay");

const cartBtn = document.getElementById("cart-btn");
const cartCounter = document.getElementById("cart-counter");
const headerCart = document.getElementById("header-cart");
const headerCartCount = document.getElementById("header-cart-count");
const apiUrl = document.querySelector('meta[name="api-url"]')?.content.replace(/\/$/, "") || "";

const displayCart = () => {
  modalContainer.innerHTML = "";
  modalContainer.style.display = "block";
  modalOverlay.style.display = "block";
  //modal Header
  const modalHeader = document.createElement("div");

  const modalClose = document.createElement("div");
  modalClose.innerText = "❌";
  modalClose.className = "modal-close";
  modalHeader.append(modalClose);

  modalClose.addEventListener("click", () => {
    modalContainer.style.display = "none";
    modalOverlay.style.display = "none";
  });

  const modalTitle = document.createElement("div");
  modalTitle.innerText = "Tu carrito";
  modalTitle.className = "modal-title";
  modalHeader.append(modalTitle);

  modalContainer.append(modalHeader);

  //modal body
  if (cart.length > 0) {
    cart.forEach((product) => {
      const modalBody = document.createElement("div");
      modalBody.className = "modal-body";
      modalBody.innerHTML = `
            <div class="product">
                <img class="product-img" src="${product.img}" />
                <div class="product-info">
                    <h4>${product.productName}</h4>
                </div>
                <div class="quantity">
                    <span class="quantity-btn-decrese">-</span>
                    <span class="quantity-input">${product.quanty}</span>
                    <span class="quantity-btn-increse">+</span>
                </div>
                    <div class="price">$${product.price * product.quanty}</div>
                    <div class="delete-product">❌</div>
            </div>
            `;
      modalContainer.append(modalBody);

      //acción boton -
      const decrese = modalBody.querySelector(".quantity-btn-decrese");
      decrese.addEventListener("click", () => {
        if (product.quanty !== 1) {
          product.quanty--;
          displayCart();
        }
        diplayCartCounter();
      });

      //acción boton +
      const increse = modalBody.querySelector(".quantity-btn-increse");
      increse.addEventListener("click", () => {
        product.quanty++;
        displayCart();
        diplayCartCounter();
      });

      //acción borrar (delete)
      const deleteProduct = modalBody.querySelector(".delete-product");
      deleteProduct.addEventListener("click", () => {
        deleteCartProduct(product.id); //llamamos la funcion para eliminar
        displayCart();
        diplayCartCounter();
      });
    });

    //modal footer
    const total = cart.reduce(
      (acc, elementos) => acc + elementos.price * elementos.quanty,
      0,
    );

    const modalFooter = document.createElement("div");
    modalFooter.className = "modal-footer";
    modalFooter.innerHTML = `
        <div class="total-price">Total: $${total}</div>
        <button class="btn-primary" id="checkout-btn">Ir a pagar <span>↗</span></button>
        <div id="walletBrick_container"></div>
        <div id="button-checkout"></div>
        `;
    modalContainer.append(modalFooter);

    //MERCADO PAGO
    const mp = new MercadoPago("APP_USR-690bbc0d-c3f3-439f-9e9b-31acffee85dd", {
      locale: "es-AR",
    });
    const checkoutButton = modalFooter.querySelector("#checkout-btn");
    checkoutButton.addEventListener("click", function () {
      checkoutButton.disabled = true;
      checkoutButton.innerText = "Cargando pago...";

      const bricksBuilder = mp.bricks();
      const renderWalletBrick = async (bricksBuilder) => {
        const settings = {
          initialization: {
            redirectMode: "self",
          },
          customization: {
            theme: "default",
            valueProp: "security_safety",
            customStyle: {
              hideValueProp: true,
              valuePropColor: "blue", // blue, white, black
              buttonHeight: "48px", // min 48px - max free
              borderRadius: "6px",
              verticalPadding: "8px", // min 8px - max free
              horizontalPadding: "0px", // min 0px - max free
            },
            checkout: {
              theme: {
                elementsColor: "#4287F5", // color hex code
                headerColor: "#4287F5", // color hex code
              },
            },
          },
          callbacks: {
            onReady: () => {
              checkoutButton.remove();
            },
            onError: (error) => {
              console.error("Error al cargar Mercado Pago:", error);
              checkoutButton.disabled = false;
              checkoutButton.innerText = "Ir a pagar";
            },
            onSubmit: (formData) => {
              const yourRequestBodyHere = {
                items: [
                  {
                    id: "prod-1",
                    title: "Compra de ecommerce",
                    description: "Carrito",
                    quantity: 1,
                    unit_price: total,
                  },
                ],
                purpose: "wallet_purchase",
              };
              return new Promise((resolve, reject) => {
                fetch(`${apiUrl}/create_preference`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(yourRequestBodyHere),
                })
                  .then(async (response) => {
                    const result = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        result.error || "No se pudo crear la preferencia",
                      );
                    }

                    return result;
                  })
                  .then((response) => {
                    console.log("create_preference response:", response);
                    resolve(response.preference_id);
                  })
                  .catch((error) => {
                    console.error("Error al iniciar el pago:", error);
                    reject(error);
                  });
              });
            },
          },
        };
        window.walletBrickController = await bricksBuilder.create(
          "wallet",
          "walletBrick_container",
          settings,
        );
      };
      renderWalletBrick(bricksBuilder).catch((error) => {
        console.error("No se pudo cargar el botón de Mercado Pago:", error);
        checkoutButton.disabled = false;
        checkoutButton.innerText = "Ir a pagar";
      });
    });
  } else {
    const modalText = document.createElement("h2");
    modalText.className = "modal-body";
    modalText.innerText = "Tu carrito está vacío";
    modalContainer.append(modalText);
  }
};

cartBtn.addEventListener("click", displayCart);
headerCart.addEventListener("click", displayCart);

//funcion eliminar productos
const deleteCartProduct = (id) => {
  const foundID = cart.findIndex((element) => element.id === id);
  console.log(foundID);
  cart.splice(foundID, 1);
  displayCart();
};

//contador de productos del carro
const diplayCartCounter = () => {
  const cartLength = cart.reduce((acc, elementos) => acc + elementos.quanty, 0);
  if (cartLength > 0) {
    cartCounter.style.display = "block";
    cartCounter.innerText = cartLength;
    headerCartCount.innerText = cartLength;
  } else {
    cartCounter.style.display = "none";
    headerCartCount.innerText = "0";
  }
};

const renderPaymentStatus = (status) => {
  const previousMessage = document.querySelector(".payment-status");
  previousMessage?.remove();
  const statusMessage = document.createElement("div");
  statusMessage.className = `payment-status payment-status-${status}`;

  if (status === "approved") {
    statusMessage.innerText = "Pago aprobado. ¡Gracias por tu compra!";
    cart.length = 0;
    diplayCartCounter();
    modalContainer.style.display = "none";
    modalOverlay.style.display = "none";
  } else if (status === "pending") {
    statusMessage.innerText = "Pago pendiente de confirmación.";
  } else {
    statusMessage.innerText = "El pago no fue aprobado.";
  }

  document.body.prepend(statusMessage);
};

const showPaymentStatus = () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");

  if (!status) return;

  if (window.opener && window.opener !== window) {
    window.opener.postMessage(
      { type: "payment-status", status },
      window.location.origin,
    );
    window.close();
  }

  renderPaymentStatus(status);
  window.history.replaceState({}, document.title, window.location.pathname);
};

window.addEventListener("message", (event) => {
  if (
    event.origin === window.location.origin &&
    event.data?.type === "payment-status"
  ) {
    renderPaymentStatus(event.data.status);
  }
});

showPaymentStatus();
