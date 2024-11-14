var http = require("http"); // Requires the built-in http module
// Defines a function that’ll handle incoming HTTP requests
function requestHandler(request, response) {
console.log("Incoming request to: " + request.url);
 response.end("Hello, world!");
}
// Creates a server that uses your function to handle requests
var server = http.createServer(requestHandler);
// Starts the server listening on port 3000
server.listen(3000);