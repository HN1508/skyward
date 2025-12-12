// server.js
const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");

app.use(cors());
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
/**
 * 👉 THAY CHO ĐÚNG encoded_id CỦA BẠN
 * Ví dụ từ Network bạn thấy:
 * https://gw.cake.vn/public/user-group-account/statement?encoded_id=3185535398&next_page=
 */
const CAKE_API_URL =
  "https://gw.cake.vn/public/user-group-account/statement?encoded_id=3185535398&next_page=";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * Dò tất cả số trong JSON, trả về số lớn nhất
 * (thường sẽ là số dư hiện tại, vì nó lớn hơn từng giao dịch lẻ)
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

// API trả số dư cho frontend
// API trả số dư cho frontend
app.get("/api/fund-balance", async (req, res) => {
  try {
    console.log("Gọi đến /api/fund-balance, đang fetch API JSON của Cake...");

    const response = await axios.get(CAKE_API_URL, {
      timeout: 15000
    });

    const data = response.data;

    // ==== LẤY ĐÚNG FIELD BALANCE THEO JSON CỦA CAKE ====
    let balance = null;

    // 1) Ưu tiên data.balance (root)
    if (data && data.balance != null) {
      const n = Number(data.balance);
      if (!Number.isNaN(n)) {
        balance = n;
      }
    }

    // 2) Nếu chưa có, thử data.group_info.balance
    if (
      balance === null &&
      data &&
      data.group_info &&
      data.group_info.balance != null
    ) {
      const n = Number(data.group_info.balance);
      if (!Number.isNaN(n)) {
        balance = n;
      }
    }

    // 3) Nếu vẫn không có, fallback: đoán max number trong JSON
    if (balance === null) {
      const guessed = findMaxNumberInObject(data);
      console.log(
        "Không thấy field balance rõ ràng, đoán theo max number:",
        guessed
      );
      balance = guessed;
    }

    if (typeof balance !== "number" || !Number.isFinite(balance)) {
      console.error(
        "Không tìm được số dư hợp lệ trong JSON:",
        JSON.stringify(data, null, 2)
      );
      return res.status(500).json({
        error:
          "Không tìm được số dư trong JSON Cake. Cần chỉnh lại field đọc balance."
      });
    }

    console.log("Lấy được số dư từ API JSON:", balance);

    return res.json({
      balance,
      currency: "VND",
      raw: balance.toLocaleString("vi-VN") + " đ",
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error("Lỗi khi gọi API JSON Cake:", err.message);
    return res.status(500).json({
      error: "Không lấy được dữ liệu từ Cake",
      detail: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
