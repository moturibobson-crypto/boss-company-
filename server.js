require('dotenv').config();
const express = require('express');
const path = require('path');
const api = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', api);
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/', (req, res) => {
  const frontendIndex = path.join(__dirname, 'frontend', 'bosss.html');
  const legacy = path.join(__dirname, 'boss.html');
  res.sendFile(frontendIndex, err => {
    if (err) res.sendFile(legacy);
  });
});
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
