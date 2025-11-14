
const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
const apiVersion = process.env.BIGCOMMERCE_API_VERSION || "v3";
const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/${apiVersion}`;

const headers = {
  "X-Auth-Token": accessToken,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const fetchPromotions = async () => {
  const url = `${baseUrl}/promotions`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch promotions (${res.status}): ${text}`);
  }

  const { data } = await res.json();
  const now = new Date();

  return data
    .filter((promo) => {
      const starts = new Date(promo.start_date);
      const ends = promo.end_date ? new Date(promo.end_date) : null;
      return (
        promo.status === "ENABLED" &&
        promo.redemption_type === "AUTOMATIC" &&
        starts <= now &&
        (!ends || now <= ends)
      );
    })
    .map((promo) => ({
      id: promo.id,
      name: promo.name,
      label: promo.display_name || promo.name,
      type: promo.redemption_type,
      discount: promo.rules?.[0]?.action?.cart_items?.discount || null,
      start_date: promo.start_date || null,
      end_date: promo.end_date || null,
    }));
};

export default async function (context, req) {
  // GET-only
  if (req.method !== "GET") {
    context.res = {
      status: 405,
      headers: {
        "Allow": "GET",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
    return;
  }

  try {
    const promos = await fetchPromotions();
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promos),
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Error retrieving promotions",
        details: err?.message || "Unknown error",
      }),
    };
  }
}
