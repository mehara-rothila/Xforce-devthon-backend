console.log("--- MINIMAL SERVER TEST STARTING ---");

const express = require('express');
console.log("Minimal: Loaded express");

const app = express();
console.log("Minimal: Initialized app");

const PORT = process.env.PORT || 3000;

// Basic Root Route
app.get('/', (req, res) => {
  console.log("Minimal: Root route '/' hit!");
  res.send('Minimal Server Test OK');
});

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log("--- MINIMAL SERVER SUCCESSFULLY STARTED ---");
});

console.log("Minimal: Reached end of script execution.");