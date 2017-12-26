const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');

var app = express();
var mysql = require('mysql');
var request = require("request");

function sendSuccess(username, puzzlename, IP) {
  //request.post(process.env.IFTTT_SOLVE, {json: {value1: username, value2: puzzlename, value3: IP}}, function(err, res, body) {});
}

function sendGuess(puzzlename, guess, IP) {
  //request.post(process.env.IFTTT_GUESS, {json: {value1: IP, value2: puzzlename, value3: guess}}, function(err, res, body) {});
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
      res.cookie("username", username, {maxAge : 999999999}).redirect(backURL);
    })
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

if(false) {
  app.get("/", function(req, res) {
    res.render("pages/start");
  })
}
else {
    app.get("/", function(req, res) {
      var connection = mysql.createConnection(process.env.JAWSDB_URL);

      connection.connect();
      connection.query('SELECT name, title from puzzles where issolved = 1 ORDER BY name', function(err, topRows, fields) {
        var allGuessed = topRows;
        var connection = mysql.createConnection(process.env.JAWSDB_URL);

        connection.connect();
        connection.query('SELECT (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
          if (err) throw err;
          res.render("pages/index", {message: "", username: req.cookies.username, allGuessed: topRows, total: rows[0].total, remaining: rows[0].remaining, totalMeta: rows[0].totalMeta, remainingMeta: rows[0].remainingMeta, totalFinal: rows[0].totalFinal, remainingFinal: rows[0].remainingFinal});
        });
        connection.end();
      });
      
      connection.end();
    });

    app.get("/meta", function(req, res) {
      var username = req.cookies.username;
      if(!username) username = "";
      var isRight = null;
      if(req.query && req.query.isRight != undefined) isRight = req.query.isRight;
      var connection = mysql.createConnection(process.env.JAWSDB_URL);
      connection.connect();
      connection.query('SELECT * FROM guesses where puzzlename = ? ORDER BY `timestamp` DESC', ["meta"], function(err, rowsTop, fields) {
        var connection = mysql.createConnection(process.env.JAWSDB_URL);

        connection.connect();
        connection.query('SELECT (SELECT bool from show_solutions LIMIT 1) as show_solutions, (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
          if (err) throw err;
          res.render("pages/meta", {
            username: req.cookies.username, 
            guesses: rowsTop, 
            isRight: isRight,
            total: rows[0].total, 
            remaining: rows[0].remaining, 
            totalMeta: rows[0].totalMeta, 
            remainingMeta: rows[0].remainingMeta,
            totalFinal: rows[0].totalFinal, 
            remainingFinal: rows[0].remainingFinal,
            show_solutions: rows[0].show_solutions,
            name: "meta",
          });
        });
        connection.end();
      });
      connection.end();
    });

    app.get("/meta/ShowMeTheSolution", function(req, res) {
      var solutionPath = "views/solutions/meta.ejs";
      if(require("fs").existsSync(solutionPath)) {
        res.render("solutions/meta.ejs");
      }
      else {
        res.status(404).send("Sorry, this solution has not yet been written / uploaded.");
      }
    });

    app.post("/meta", function(req, res) {
      var answer = req.body.answer;
      if(!answer) answer="";
      var username = req.cookies.username;
      if(!username) username = "";

      answer = JSON.stringify(answer).replace(/[^a-z]/gi, '').toUpperCase();

      sendGuess("meta", answer, req.headers['x-forwarded-for'] + " | " + username);

      var connection = mysql.createConnection(process.env.JAWSDB_URL);
      connection.connect();
      
      connection.query('SELECT COUNT(*) as count from metas where answer = ?;', [answer], function(err, rowsTop, fields) {
        var func = function() {
          var connection = mysql.createConnection(process.env.JAWSDB_URL);
          
          connection.connect();

          connection.query('UPDATE metas set issolved = 1 where answer = ?', [answer], function(err, rows, fields) { });
          
          connection.end();
        }
        var isRight = false;
        if(rowsTop[0].count == 1) {
          isRight = true;
          func();
          sendSuccess(username, "meta - " + answer, req.headers['x-forwarded-for']);
        }
        var connection = mysql.createConnection(process.env.JAWSDB_URL);

        connection.connect();

        connection.query('INSERT INTO guesses SET ?', {puzzlename: "meta", player: username, didsolve: rowsTop[0].count == 1, guess: answer}, function(err, rows, fields) {
          res.redirect("/meta?isRight=" + isRight);
        });
        
        connection.end();
      });
      connection.end();
    });

    app.get("/final", function(req, res) {

      var isRight = null;
      if(req.query && req.query.isRight != undefined) isRight = req.query.isRight;
      var connection = mysql.createConnection(process.env.JAWSDB_URL);

      connection.connect();
      connection.query('SELECT (SELECT bool from show_solutions LIMIT 1) as show_solutions, (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
        if (err) throw err;
        res.render("pages/final", {
          username: req.cookies.username, 
          guesses: [], 
          isRight: isRight,
          total: rows[0].total,
          remaining: rows[0].remaining, 
          totalMeta: rows[0].totalMeta, 
          remainingMeta: rows[0].remainingMeta,
          totalFinal: rows[0].totalFinal, 
          remainingFinal: rows[0].remainingFinal,
          show_solutions: rows[0].show_solutions,
          name: "final",
        });
      });
      connection.end();
    });

    app.get("/final/ShowMeTheSolution", function(req, res) {
      var solutionPath = "views/solutions/final.ejs";
      if(require("fs").existsSync(solutionPath)) {
        res.render("solutions/final.ejs");
      }
      else {
        res.status(404).send("Sorry, this solution has not yet been written / uploaded.");
      }
    });

    app.post("/final", function(req, res) {
      var answer = req.body.answer;
      if(!answer) answer="";
      var username = req.cookies.username;
      if(!username) username = "";

      answer = JSON.stringify(answer).replace(/[^a-z]/gi, '').toUpperCase();

      sendGuess("final", answer, req.headers['x-forwarded-for'] + " | " + username);

      var connection = mysql.createConnection(process.env.JAWSDB_URL);
      connection.connect();
      
      connection.query('SELECT COUNT(*) as count from final where answer = ?;', [answer], function(err, rowsTop, fields) {
        var func = function() {
          var connection = mysql.createConnection(process.env.JAWSDB_URL);
          
          connection.connect();

          connection.query('UPDATE final set issolved = 1 where answer = ?', [answer], function(err, rows, fields) { });
          
          connection.end();
        }
        var isRight = false;
        if(rowsTop[0].count == 1) {
          
          isRight = true;
          func();
          sendSuccess(username, "final - " + answer, req.headers['x-forwarded-for']);
          //return res.render("pages/congrats");
        }
        var connection = mysql.createConnection(process.env.JAWSDB_URL);

        connection.connect();

        connection.query('INSERT INTO guesses SET ?', {puzzlename: "final", player: username, didsolve: rowsTop[0].count == 1, guess: answer}, function(err, rows, fields) {
          if(isRight == true) res.render("pages/congrats");
          else res.redirect("/final");
        });
        
        connection.end();
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
        var solutionPath = "../solutions/" + row.partialname + ".ejs";
        var title = row.title;
        var answer = row.answer;
        app.get("/" + name, function(req, res) {
          var username = req.cookies.username;
          if(!username) username = "";
          var isRight = null;
          if(req.query && req.query.isRight != undefined) isRight = req.query.isRight;
          var connection = mysql.createConnection(process.env.JAWSDB_URL);
          connection.connect();
          connection.query('SELECT * FROM guesses where puzzlename = ? ORDER BY `timestamp` DESC', [name], function(err, rowsTop, fields) {
            var connection = mysql.createConnection(process.env.JAWSDB_URL);

            connection.connect();
            connection.query('SELECT (SELECT bool from show_solutions LIMIT 1) as show_solutions, (SELECT COUNT(*) from puzzles) as total, (SELECT COUNT(*) from puzzles where issolved = 0) as remaining, (SELECT COUNT(*) from metas) as totalMeta, (SELECT COUNT(*) from metas where issolved = 0) as remainingMeta, (SELECT COUNT(*) from final) as totalFinal, (SELECT COUNT(*) from final where issolved = 0) as remainingFinal;', function(err, rows, fields) {
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
                show_solutions: rows[0].show_solutions,
              });
            });
            connection.end();
          });
          connection.end();
        });

        app.get("/" + name + "/ShowMeTheSolution", function(req, res) {
          //var solution = "views/solutions/" + name + ".ejs";
          console.log(require("fs").resolve("../../" + solutionPath))
          if(require("fs").existsSync("../../" + solutionPath) || require("fs").existsSync("solutions/" + row.partialname + ".ejs")) {
            //res.render("solutions/" + name + ".ejs");
            res.render("pages/solution", {
              partial: solutionPath,
              name: name,
              title: title,
              answer: answer,
            })
          }
          else {
            res.status(404).send("Sorry, this solution has not yet been written / uploaded.");
          }
        });

        app.post("/" + name, function(req, res) {
          var answer = req.body.answer;
          if(!answer) answer="";
          var username = req.cookies.username;
          if(!username) username = "";

          answer = JSON.stringify(answer).replace(/[^a-z]/gi, '').toUpperCase();

          sendGuess(name, answer, req.headers['x-forwarded-for'] + " | " + username);

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
      if(rows.length) {
        res.redirect("/" + rows[0].name);
      }
      else {
        res.sendStatus(404);
      }
    });

    connection.end();
  });

  app.get("/truerandom", function(req, res) {
    var connection = mysql.createConnection(process.env.JAWSDB_URL);

    connection.connect();

    connection.query('SELECT * from puzzles ORDER BY RAND() LIMIT 1;', function(err, rows, fields) {
      if (err) throw err;
      res.redirect("/" + rows[0].name);
    });

    connection.end();
  });

  app.get("/firstsolves", function(req, res) {
    var connection = mysql.createConnection(process.env.JAWSDB_URL);

    connection.connect();

    connection.query('SELECT puzzle.answer, puzzle.name, (select guesses.player from guesses as guesses where guesses.puzzlename = puzzle.name and guesses.didsolve = 1 ORDER BY guesses.timestamp LIMIT 1) as playername from puzzles as puzzle ORDER by puzzle.name;', function(err, rows, fields) {
      if (err) throw err;
      //res.redirect("/" + rows[0].name);
      var answers = rows.filter(function(el) { return el.playername != null;})
      res.render("pages/firstsolve", {
        answers: answers
      });
    });

    connection.end();
  })
}