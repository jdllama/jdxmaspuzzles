const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');

var app = express();

app.use(express.static(path.join(__dirname, 'public')))
    .set("views", path.join(__dirname, 'views'))
    .set("view engine", "ejs")
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())
    .use(cookieParser())
    .use(function(req, res, next) {
      for (var key in req.query)
      { 
        req.query[key.toLowerCase()] = req.query[key];
      }
      next();
    })
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

  app.get("/", function(req, res) {
    res.render("pages/index", {});
  });

var mysql = require('mysql');
var connection = mysql.createConnection(process.env.JAWSDB_URL);

connection.connect();

connection.query('SELECT * from puzzles;', function(err, rows, fields) {
  if (err) throw err;

  //console.log('The solution is: ', rows[0].solution);
  rows.forEach(function(row) {
    var name = row.name;
    var partial = "partials/" + row.partialname + ".ejs";
    console.log(partial)
    app.get("/" + name, function(req, res) {
      res.render("pages/puzzle", {partial: partial, name: name});
    });
  });
});

connection.end();