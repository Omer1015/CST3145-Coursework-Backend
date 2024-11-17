const express = require("express"); // Requires the Express module
const propertiesReader = require("properties-reader");
const path = require("path");
const fs = require("fs");


const app = express(); // Calls the express function to start a new Express application

// Load properties from db.properties
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbPprefix = properties.get("db.prefix");
// URL-Encoding of User and PWD for potential special characters
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");

// Construct MongoDB connection URI
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + "/" + dbName + dbParams;

// Import MongoDB client
const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db;

// Connect to MongoDB
client.connect()
  .then(() => {
    console.log("Connected to MongoDB");
    db = client.db(dbName);
    // Check if the connection is successful and list collections
    db.listCollections().toArray().then((collections) => {
      console.log("Available collections:", collections.map(c => c.name));
    }).catch(console.error);
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // Exit if connection fails
  });


// Middleware to log requests
app.use((req, res, next) => {
  console.log("Request URL:", req.url);
  console.log("Request Date:", new Date());
  next();
});

// MongoDB route for collections
app.param("collectionName", function (req, res, next, collectionName) {
  req.collection = db.collection(collectionName);
  return next();
});

app.get("/collections/:collectionName", function (req, res, next) {
    req.collection.find({}).toArray(function (err, results) {
      if (err) {
        console.error("Error fetching collection:", err);
        return next(err);
      }
      console.log("Fetched results from collection:", results);
      res.json(results); // Use `res.json` for proper JSON formatting
    });
  });
  

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Custom middleware for serving files
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
  res.status(404).send("File not found!");
});

// Start the server
app.listen(3000, () => {
  console.log("App started on port 3000");
});
