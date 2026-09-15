import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MercadoPagoConfig, Preference } from "mercadopago";

const app = express();
try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.MP_ACCESS_TOKEN) {
	throw new Error("Falta la variable de entorno MP_ACCESS_TOKEN");
}

const client = new MercadoPagoConfig({
	accessToken: process.env.MP_ACCESS_TOKEN,
});
const preferenceClient = new Preference(client);
const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
let configuredUrl;
let publicHttpsUrl;

try {
  const parsedPublicUrl = publicUrl ? new URL(publicUrl) : undefined;
  configuredUrl = parsedPublicUrl?.origin;
  publicHttpsUrl = parsedPublicUrl?.protocol === "https:" ? configuredUrl : undefined;
} catch {
  configuredUrl = undefined;
  publicHttpsUrl = undefined;
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("trust proxy", true);

app.use(express.static(path.join(__dirname, "../client")));
app.use(cors());

app.get("/", function (req, res) {
	res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.post("/create_preference", async (req, res) => {
  try {
    const item = req.body?.items?.[0];

    const description = item?.title;
    const unitPrice = Number(item?.unit_price);
    const itemQuantity = Number(item?.quantity);

    if (!description || !Number.isFinite(unitPrice) || !Number.isInteger(itemQuantity)) {
      return res.status(400).json({ error: "Datos de compra inválidos" });
    }

    const requestUrl = `${req.protocol}://${req.get("host")}`;
    const returnUrl = configuredUrl || requestUrl;
    const preference = {
      items: [
        { title: description, unit_price: unitPrice, quantity: itemQuantity, currency_id: "ARS" }
      ],
      back_urls: {
        success: `${returnUrl}/feedback`,
        failure: `${returnUrl}/feedback`,
        pending: `${returnUrl}/feedback`,
      },
      ...(publicHttpsUrl && { auto_return: "approved" }),
      purpose: "wallet_purchase",
    };

    const mpResponse = await preferenceClient.create({ body: preference });
    console.log("Preference created:", mpResponse.id);
    res.json({ preference_id: mpResponse.id });
  } catch (error) {
    console.error("Error creating preference:", error);
    res.status(500).json({ error: "No se pudo crear la preferencia de pago" });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido" });
  }

  next(error);
});

app.get("/feedback", function (req, res) {
  const params = new URLSearchParams({
    status: req.query.status || "unknown",
    payment_id: req.query.payment_id || "",
    merchant_order_id: req.query.merchant_order_id || "",
  });

  res.redirect(303, `${frontendUrl || "http://localhost:3000"}/?${params.toString()}`);
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`The server is now running on Port ${port}`);
});
