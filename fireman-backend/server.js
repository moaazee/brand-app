const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Dummy alerts (simulating SMS alerts) — in Danish
const alerts = [
  {
    id: 1,
    adresse: "Industrivej 12",
    brandsted: "Køkken",
    farer: "Propan, Svovlsyre",
    ekstraInfo: "Hold 150m afstand. Brug åndedrætsværn.",
    lat: 55.67594,
    lng: 12.56553
  },
  {
    id: 2,
    adresse: "Roskildevej 45",
    brandsted: "Væg",
    farer: "Ingen",
    ekstraInfo: "Almindelig brandslukning.",
    lat: 55.67958,
    lng: 12.57097
  }
];

// Endpoint to fetch alerts
app.get('/alerts', (req, res) => {
  res.json(alerts);
});

app.listen(PORT, () => {
  console.log(`🔥 Server kører på port ${PORT}`);
});
