const express = require("express"); // Requires the Express module
const propertiesReader = require("properties-reader");
const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongodb");


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

app.get("/collections/:collectionName", async (req, res, next) => {
    try {
      const results = await req.collection.find({}).toArray();
      res.json(results);
    } catch (error) {
      next(error);
    }
  });

  //Sorting with Get Start
  app.get(
    "/collections/:collectionName/:limit/:sortBy/:order",
    async (req, res, next) => {
      try {
        // Extract parameters
        const { limit, sortBy, order } = req.params;
  
        // Validate 'limit' parameter
        const maxResults = parseInt(limit, 10);
        if (isNaN(maxResults) || maxResults <= 0) {
          return res.status(400).json({
            error: "Invalid limit. Must be a positive integer.",
          });
        }
  
        // Determine sort direction
        const sortDirection = order.toLowerCase() === "desc" ? -1 : 1;
  
        // Ensure valid sort field and direction
        if (!["asc", "desc"].includes(order.toLowerCase())) {
          return res.status(400).json({
            error: "Invalid order. Must be 'asc' or 'desc'.",
          });
        }
  
        console.log(`Fetching ${maxResults} documents from collection '${req.params.collectionName}'`);
        console.log(`Sorting by '${sortBy}' in '${order}' order`);
  
        // Query database
        const sortedData = await req.collection
          .find({})
          .sort({ [sortBy]: sortDirection }) // Dynamic sorting
          .limit(maxResults) // Limit results
          .toArray();
  
        // Send results
        res.json({
          message: "Query successful",
          collection: req.params.collectionName,
          limit: maxResults,
          sortBy,
          order,
          results: sortedData,
        });
      } catch (error) {
        console.error("Error during query execution:", error);
        next(error); // Pass error to middleware
      }
    }
  );

  //Sorting with Get End

  //Post Functionality Start

  // Middleware to parse JSON body in requests
app.use(express.json());

// POST route to insert a new document into the specified collection
app.post("/collections/:collectionName", async (req, res, next) => {
  try {
    // Log the incoming data for debugging
    console.log("Request Body:", req.body);

    // Ensure the request body is not empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is empty or invalid." });
    }

    // Validation
    if (!req.body.title || !req.body.price) {
      return res.status(400).json({
        error: "Missing required fields. Ensure 'title' and 'price' are provided.",
      });
    }

    const result = await req.collection.insertOne(req.body);

    // Respond with the result of the insertion
    res.status(201).json({
      message: "Document inserted successfully.",
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error("Error inserting document:", err);
    next(err); // Pass the error to the error-handling middleware
  }
});

//Post Functionality End  

//Put Functionality Start

app.put('/collections/:collectionName/:id', async (req, res, next) => {
    try {
        const collectionName = req.params.collectionName; // Collection name from the URL
        const documentId = parseInt(req.params.id, 10); // Document ID from the URL
        const updateFields = req.body; // Update Field
        const collection = db.collection(collectionName);
        
        //Validate and update the document
        const result = await collection.updateOne(
            { id: documentId }, // Match by `id` field
            { $set: updateFields } // Update fields
        );

        if (result.matchedCount === 0) {
            res.status(404).send({ msg: "Document not found" });
        } else {
            res.send({ msg: "Document updated successfully" });
        }
    } catch (err) {
        console.error("Error updating document:", err);
        res.status(500).send({ error: "An error occurred while updating the document" });
    }
});


//Put Functionality End

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

// app.listen(3000, function() {
// console.log("App started on port 3000");
// });
const port = process.env.PORT || 3000;
app.listen(port, function() {
 console.log("App started on port: " + port);
});
