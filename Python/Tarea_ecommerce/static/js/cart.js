(() => {
  const getCookie = (name) => {
    const value = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${name}=`));
    return value ? decodeURIComponent(value.split("=").slice(1).join("=")) : "";
  };

  const updateCartCount = (count) => {
    const badge = document.querySelector("#cart-count");
    if (badge && count !== undefined) badge.textContent = count;
  };

  document.querySelectorAll("[data-cart-row]").forEach((row) => {
    const quantity = row.querySelector("[data-quantity]");
    const subtotal = row.querySelector("[data-subtotal]");
    let requestPending = false;

    quantity.addEventListener("change", async () => {
      if (requestPending) return;
      requestPending = true;
      const body = new URLSearchParams({ quantity: quantity.value });
      try {
        const response = await fetch(row.dataset.updateUrl, {
          method: "POST",
          headers: { "X-CSRFToken": getCookie("csrftoken"), "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo actualizar el carrito.");
        subtotal.textContent = `$${result.subtotal}`;
        document.querySelector("#cart-total").textContent = `$${result.total}`;
        updateCartCount(result.cart_count);
      } catch (error) {
        window.alert(error.message);
      } finally {
        requestPending = false;
      }
    });

    row.querySelector("[data-remove]").addEventListener("click", async () => {
      const response = await fetch(row.dataset.removeUrl, {
        method: "POST",
        headers: { "X-CSRFToken": getCookie("csrftoken"), "X-Requested-With": "XMLHttpRequest" },
      });
      if (!response.ok) return;
      row.remove();
      const rows = [...document.querySelectorAll("[data-cart-row]")];
      const total = rows.reduce((sum, current) => sum + Number(current.querySelector("[data-subtotal]").textContent.replace("$", "")), 0);
      document.querySelector("#cart-total").textContent = `$${total.toFixed(2)}`;
      updateCartCount(rows.reduce((sum, current) => sum + Number(current.querySelector("[data-quantity]").value), 0));
      if (!rows.length) window.location.reload();
    });
  });
})();