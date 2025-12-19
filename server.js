const path = require("path");
const express = require("express");
const app = express();

app.get("/preview", (req, res) => {
  res.sendFile(
    path.join(__dirname, "render-test", "renders", "sparkle_text_test.mp4")
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
