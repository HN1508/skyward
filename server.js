// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * 👉 THAY encoded_id CHO ĐÚNG
 */
const CAKE_API_URL =
  "https://gw.cake.vn/public/user-group-account/statement?encoded_id=3185535398&next_page=";

/**
 * Dò tất cả số trong JSON, trả về số lớn nhất
 */
function findMaxNumberInObject(obj) {
  let max = null;

  function walk(val) {
    if (typeof val === "number" && Number.isFinite(val)) {
      if (max === null || val > max) max = val;
    } else if (Array.isArray(val)) {
      val.forEach(walk);
    } else if (val && typeof val === "object") {
      Object.values(val).forEach(walk);
    }
  }

  walk(obj);
  return max;
}

// ===== API trả số dư =====
app.get("/api/fund-balance", async (req, res) => {
  try {
    console.log("Fetch Cake API...");

    const response = await axios.get(CAKE_API_URL, {
      timeout: 15000,
    });

    const data = response.data;
    let balance = null;

    // 1) data.balance
    if (data?.balance != null) {
      const n = Number(data.balance);
      if (!Number.isNaN(n)) balance = n;
    }

    // 2) data.group_info.balance
    if (
      balance === null &&
      data?.group_info?.balance != null
    ) {
      const n = Number(data.group_info.balance);
      if (!Number.isNaN(n)) balance = n;
    }

    // 3) fallback: max number
    if (balance === null) {
      balance = findMaxNumberInObject(data);
    }

    if (typeof balance !== "number" || !Number.isFinite(balance)) {
      return res.status(500).json({
        error: "Không tìm được số dư hợp lệ trong JSON Cake",
      });
    }

    return res.json({
      balance,
      currency: "VND",
      raw: balance.toLocaleString("vi-VN") + " đ",
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cake API error:", err.message);
    return res.status(500).json({
      error: "Không lấy được dữ liệu từ Cake",
      detail: err.message,
    });
  }
});

// ===== START SERVER (CHỈ 1 LẦN) =====
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
