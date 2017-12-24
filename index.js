const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');

var app = express();
var mysql = require('mysql');
var request = require("request");

function sendSuccess(username, puzzlename, IP) {
  request.post(process.env.IFTTT_SOLVE, {json: {value1: username, value2: puzzlename, value3: IP}}, function(err, res, body) {console.log(err, res, body)});
}

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
    .post("/setusername", function(req, res) {
      var backURL = req.header("Referer") || "/";
      var username = req.body.username;
      if(!username) username = "";
      res.cookie("username", username).redirect(backURL);
    })
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

  app.get("/", function(req, res) {
    var connection = mysql.createConnection(process.env.JAWSDB_URL);

    connection.connect();
    connection.query('SELECT name, title from puzzles where issolved = 1 ORDER BY name', function(err, topRows, fields) {
      var allGuessed = topRows;
      var connection = mysql.createConnection(process.env.JAWSDB_URL);

      connection.connect();
      connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
        if (err) throw err;
        //console.dir(rows)
        res.render("pages/index", {message: "", username: req.cookies.username, allGuessed: topRows, total: rows[0].total, remaining: rows[0].remaining, totalMeta: rows[0].totalMeta, remainingMeta: rows[0].remainingMeta, totalFinal: rows[0].totalFinal, remainingFinal: rows[0].remainingFinal});
      });
      connection.end();
    });
    
    connection.end();
  });

  app.get("/meta", function(req, res) {
    res.render("pages/meta", {username: req.cookies.username, guesses: []});
    return;
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    
    connection.connect();
    connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta;', function(err, rows, fields) {
      if (err) throw err;
      //console.dir(rows)
      res.render("pages/final", {message: "", username: req.cookies.username, total: rows[0].total, remaining: rows[0].remaining, totalMeta: rows[0].totalMeta, remainingMeta: rows[0].remainingMeta});
    });
    connection.end();
  });

  app.get("/final", function(req, res) {
    //res.render("pages/final", {username: req.cookies.username, guesses: []});
    //return;
    var connection = mysql.createConnection(process.env.JAWSDB_URL);

    connection.connect();
    connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
      if (err) throw err;
      //console.dir(rows)
      res.render("pages/final", {
        username: req.cookies.username, 
        guesses: [], 
        total: rows[0].total, 
        remaining: rows[0].remaining, 
        totalMeta: rows[0].totalMeta, 
        remainingMeta: rows[0].remainingMeta,
        totalFinal: rows[0].totalFinal, 
        remainingFinal: rows[0].remainingFinal,
      });
    });
    connection.end();
  });

(function() {
  var connection = mysql.createConnection(process.env.JAWSDB_URL);

  connection.connect();

  connection.query('SELECT * from puzzles;', function(err, rows, fields) {
    if (err) throw err;

    rows.forEach(function(row) {
      var name = row.name;
      var partial = "../partials/" + row.partialname + ".ejs";
      var title = row.title;
      app.get("/" + name, function(req, res) {
        var username = req.cookies.username;
        if(!username) username = "";
        var isRight = null;
        if(req.query && req.query.isRight != undefined) isRight = req.query.isRight;
        var connection = mysql.createConnection(process.env.JAWSDB_URL);
        connection.connect();
        connection.query('SELECT  * FROM guesses where puzzlename = ? ORDER BY `timestamp` DESC', [name], function(err, rowsTop, fields) {
          var connection = mysql.createConnection(process.env.JAWSDB_URL);

          connection.connect();
          connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
            if (err) throw err;
            res.render("pages/puzzle", {
              partial: partial, 
              name: name, 
              title: title, 
              message: "", 
              username: username, 
              guesses: rowsTop, 
              isRight: isRight,
              total: rows[0].total, 
              remaining: rows[0].remaining, 
              totalMeta: rows[0].totalMeta, 
              remainingMeta: rows[0].remainingMeta, 
              totalFinal: rows[0].totalFinal, 
              remainingFinal: rows[0].remainingFinal,
            });
          });
          connection.end();
        });
        connection.end();
      });

      app.post("/" + name, function(req, res) {
        var answer = req.body.answer;
        if(!answer) answer="";
        var username = req.cookies.username;
        if(!username) username = "";

        answer = JSON.stringify(answer).replace(/[^a-z]/gi, '').toUpperCase();

        var connection = mysql.createConnection(process.env.JAWSDB_URL);
        connection.connect();
        
        connection.query('SELECT COUNT(*) as count from puzzles where name = ? and answer = ?;', [name, answer], function(err, rowsTop, fields) {
          var func = function() {
            var connection = mysql.createConnection(process.env.JAWSDB_URL);
            
            connection.connect();
  
            connection.query('UPDATE puzzles set issolved = 1 where name = ? and answer = ?', [name, answer], function(err, rows, fields) {
              //res.redirect("/" + name);
            });
            
            connection.end();
          }
          var isRight = false;
          if(rowsTop[0].count == 1) {
            isRight = true;
            func();
            sendSuccess(username, name, req.headers['x-forwarded-for']);
          }
          var connection = mysql.createConnection(process.env.JAWSDB_URL);

          connection.connect();

          connection.query('INSERT INTO guesses SET ?', {puzzlename: name, player: username, didsolve: rowsTop[0].count == 1, guess: answer}, function(err, rows, fields) {
            res.redirect("/" + name + "?isRight=" + isRight);
          });
          
          connection.end();
        });
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