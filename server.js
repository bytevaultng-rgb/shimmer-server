const axios = require('axios'); // make sure axios is installed
const express = require('express');
const app = express();

// Middleware (if not already in your server.js)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: enable CORS if frontend is separate
const cors = require('cors');
app.use(cors());

// --- ADD THIS ROUTE ---
app.post('/render', async (req, res) => {
    const { recipient, template, message } = req.body;

    if (!recipient || !template) {
        return res.status(400).json({ status: 'error', message: 'Missing recipient or template.' });
    }

    try {
        // Call shimmer-server API
        const shimmerRes = await axios.post(
            'https://shimmer-server-25yg.onrender.com/render',
            {
                compositionId: template,
                props: {
                    recipientName: recipient,
                    messageText: message || ''
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const data = shimmerRes.data;

        // Determine video URL (adjust if your server returns different field)
        const videoUrl = data.output || `https://shimmer-server-25yg.onrender.com/download/${data.filename}`;

        res.json({
            status: 'success',
            recipient,
            message,
            video_url: videoUrl
        });

    } catch (err) {
        console.error('Shimmer server error:', err.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to render template via shimmer server.',
            error: err.message
        });
    }
});
// --- END ROUTE ---
