"use strict";

var express = require("express");
var bodyParser = require("body-parser");
var dns = require("dns");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
mongoose.connect(
  "mongodb+srv://FCCDB:PmLy73Q5Kn2eT@clusterfcc-8o7kw.mongodb.net/test?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);
const urlSchema = new Schema({
  index: Number,
  url: String
});
const countSchema = new Schema({
  count: Number
});
const URL = mongoose.model("URL", urlSchema);
const COUNT = mongoose.model("COUNT", countSchema);

var incrementCount = function(done) {
  console.log("Incrementing Count");
  let count = COUNT.findOne(function(err, data) {
    if (err) {
      console.log(err);
      return err;
    }
    if (data.length < 1) {
      console.log("Count not found");
      let count = new COUNT({ count: 1 });
      count.save(function(err, data) {
        if (err) {
          console.log(err);
        }
        return done(null, data);
      });
    }
    console.log("Count found");
    data.count = data.count + 1;
    console.log("New count: " + data.count);
    data.save(function(err, data) {
      if (err) {
        console.log(err);
      }
      return done(null, data);
    });
  });
};

var createAndSaveUrl = function(urlIndex, urlString, done) {
  console.log("Creating and saving new url: " + [urlIndex, urlString]);
  let url = new URL({ index: urlIndex, url: urlString });
  url.save(function(err, data) {
    if (err) {
      return err;
    }
    console.log("Saving url: " + data);
    return done(null, data);
  });
};

var findUrlByIndex = function(urlIndex, done) {
  console.log("finding url by index: " + urlIndex);
  URL.findOne({ index: urlIndex }, function(err, data) {
    if (err) {
      return err;
    }
    console.log("found url by index: " + data);
    return done(null, data);
  });
};

var findUrlByString = function(urlString, done) {
  console.log("finding url by string: " + urlString);
  URL.findOne({ url: urlString }, function(err, data) {
    if (err) {
      return err;
    }
    console.log("found url by string: " + data);
    return done(null, data);
  });
};

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/hello", function(req, res, next) {
  res.json({ greeting: "hello API" });
  next();
});

app.get("/api/urls", function(req, res, next) {
  URL.find({}, function(err, users) {
    var userMap = {};
    users.forEach(function(user) {
      userMap[user._id] = user;
    });
    res.send(userMap);
  });
});

app.get("/api/count", function(req, res, next) {
  COUNT.find({}, function(err, users) {
    var userMap = {};
    users.forEach(function(user) {
      userMap[user._id] = user;
    });
    res.send(userMap);
  });
});

app.post("/api/shorturl/new", function(req, res, next) {
  let url = req.body["url"];
  //Check to see if this url is valid or not
  dns.lookup(url, function(err, data) {
    if (err) {
      console.log(err);
      return res.json({error: "invalid URL"})
    }
    console.log(data);
  })
  //Check to see if this url is already in the database
  findUrlByString(url, function(err, data) {
    if (data == null) {
      //If not, then add it to the database with index count+1
      incrementCount(function(err, data) {
        if (err) {
          console.log(err);
        }
        createAndSaveUrl(data.count, url, function(err, data) {
          if (err) {
            console.log(err);
          }
        });
        res.json({ original_url: url, short_url: data });
      });
    } else {
      //If so, then simply return the index it already has
      res.json({ original_url: url, short_url: data.index });
      next();
    }
  });
});

app.get("/api/shorturl/:urlIndex", function(req, res, next) {
  let urlIndex = req.params.urlIndex;
  console.log(urlIndex);
  findUrlByIndex(urlIndex, function(err, data) {
    if (err) {
      console.log(err);
    }
    if (data == null) {
      res.json({ error: "this url does not exist" });
      next();
    } else {
      console.log("Redirecting to: " + data.url);
      res.redirect(data.url);
      next();
    }
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
