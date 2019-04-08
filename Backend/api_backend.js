const express = require('express');
const app = express();

app.use(express.json()); // To support JSON-encoded body parsing!
app.use(express.static('../webApp')); // To serve files for the frontend!

//start the web server on port 3000
app.listen(3000);

//map HTTP calls to specific URLs to corresponding code
const routes = require('./routes');
routes.configure(app);

//initialize the DB connection
const db = require('./connection');
db.init();
