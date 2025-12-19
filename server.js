const path = require("path");
const express = require("express");
const app = express();

app.get("/test-output", (req, res) => {
  const file = path.join(
    __dirname,
    "render-test",
    "renders",
    "sparkle_text_test.mp4"
  );

  res.sendFile(file);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
