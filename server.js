const express = require("express"); // Requires the Express module
const path = require("path");
const fs = require("fs");

const app = express(); // Calls the express function to start a new Express application

// Middleware to log requests
app.use((req, res, next) => {
  console.log("Request URL:", req.url);
  console.log("Request Date:", new Date());
  next();
});

// Middleware to serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Direct file-serving middleware for debugging
app.use((req, res, next) => {
  const filePath = path.join(__dirname, "public", req.url);
  console.log("Attempting to serve file from:", filePath);
  
  fs.stat(filePath, (err, fileInfo) => {
    if (err) {
      console.log("File not found or error accessing file:", err);
      next(); // Pass to 404 handler
      return;
    }

    if (fileInfo.isFile()) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });
});

// 404 Middleware
app.use((req, res) => {
  res.status(404).send("Hello World");
});

// Start the server
app.listen(3000, () => {
  console.log("App started on port 3000");
});
