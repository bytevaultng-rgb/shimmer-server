const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/render-test', (req, res) => {
    res.json({ status: "ok", message: "Node server reachable!" });
});

app.listen(PORT, () => {
    console.log(`Shimmer server running on port ${PORT}`);
});


