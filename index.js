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
    //SELECT COUNT(*) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining from puzzles;
    res.render("pages/index", {message: "", username: req.cookies.username});
  });

var mysql = require('mysql');
(function() {
  var connection = mysql.createConnection(process.env.JAWSDB_URL);

  connection.connect();

  connection.query('SELECT * from puzzles;', function(err, rows, fields) {
    if (err) throw err;

    //console.log('The solution is: ', rows[0].solution);
    rows.forEach(function(row) {
      var name = row.name;
      var partial = "../partials/" + row.partialname + ".ejs";
      var title = row.title;
      app.get("/" + name, function(req, res) {
        res.render("pages/puzzle", {partial: partial, name: name, title: title, message: ""});
      });

      app.post("/" + name, function(req, res) {
        var answer = req.body.answer;
        if(!answer) answer="";
        var username = req.cookies.username;
        if(!username) username = "";

        answer = JSON.stringify(answer).replace(/[^a-z]/gi, '').toUpperCase();

        username = JSON.stringify(username).replace(/[^a-z]/gi, '');

        var connection = mysql.createConnection(process.env.JAWSDB_URL);

        connection.connect();
        connection.query('SELECT COUNT(*) as count from puzzles where name = ? and answer = ?;', [name, answer], function(err, rowsTop, fields) {
          var connection = mysql.createConnection(process.env.JAWSDB_URL);

          connection.connect();

          connection.query('INSERT INTO guesses SET ?', {puzzlename: name, player: username, didsolve: rowsTop[0].count == 1}, function(err, rows, fields) {
            console.log(err, rows);
          });
          
          connection.end();

          res.render("pages/puzzle", {partial: partial, name: name, title: title, message: rowsTop[0].count == 1});
        });

        connection.end();
      });
    });
  });

  connection.end();
})();

app.get("/random", function(req, res) {
  var connection = mysql.createConnection(process.env.JAWSDB_URL);

  connection.connect();

  connection.query('SELECT * from puzzles WHERE issolved = 0 ORDER BY RAND() LIMIT 1;', function(err, rows, fields) {
    if (err) throw err;
    console.log(rows.length)
    if(rows.length) {
      res.redirect("/" + rows[0].name);
    }
    else {
      res.sendStatus(404);
    }
  });

  connection.end();
});