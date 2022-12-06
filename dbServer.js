const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const mysql = require("mysql");
const cookieParser = require("cookie-parser");
const generateAccessToken = require("./generateAccessToken");
const { urlencoded, response } = require("express");
const imageController = require("./controllers/image-controller");

require("dotenv").config();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const db = mysql.createPool({
  connectionLimit: 100,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT,
});
app.use(
  session({
    name: "session",
    secret: "my_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 360000 * 1000, // 1hr
    },
  })
);

app.use(express.json());
app.use(cookieParser());

app.post("/createUser", async (req, res) => {
  const user = req.body.name;
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM users WHERE user = ?";
    const search_query = mysql.format(sqlSearch, [user]);
    const sqlInsert = "INSERT INTO users VALUES (0,?,?)";
    const insert_query = mysql.format(sqlInsert, [user, hashedPassword]);
    // ? will be replaced by values
    // ?? will be replaced by string
    await connection.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("------> Search Results");
      console.log(result.length);
      if (result.length != 0) {
        connection.release();
        console.log("------> User already exists");
        res.sendStatus(409);
      } else {
        await connection.query(insert_query, (err, result) => {
          connection.release();
          if (err) throw err;
          console.log("--------> Created new User");
          console.log(result.insertId);
          res.sendStatus(201);
        });
      }
    }); //end of connection.query()
  }); //end of db.getConnection()
}); //end of app.post()
app.post("/login", (req, res) => {
  const user = req.body.name;
  const password = req.body.password;
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "Select * from users where user = ?";
    const search_query = mysql.format(sqlSearch, [user]);
    await connection.query(search_query, async (err, result) => {
      connection.release();

      if (err) throw err;
      if (result.length == 0) {
        console.log("--------> User does not exist");
        res.sendStatus(404);
      } else {
        const hashedPassword = result[0].password;
        //get the hashedPassword from result
        if (await bcrypt.compare(password, hashedPassword)) {
          console.log("---------> Login Successful");
          console.log("---------> Generating accessToken");
          const token = generateAccessToken({ user: user });
          console.log(token);
          res.json({ accessToken: token });
        } else {
          res.send("---------> Password Incorrect");
          res.send("Password incorrect!");
        } //end of bcrypt.compare()
      } //end of User exists i.e. results.length==0
    }); //end of connection.query()
  }); //end of db.connection()
}); //end of app.post()

//routes and APIs
app.get("/", (req, res) => {
  res.render("login");
});
app.get("/remote", (req, res) => {
  res.render("remote");
});
app.get("/charts", (req, res) => {
  res.render("charts");
});
app.get("/export", (req, res) => {
  res.render("export");
});
app.get("/home", (req, res) => {
  res.render("home");
});
app.get("/signup", (req, res) => {
  res.render("register");
});
app.get("/recents", function (req, res, next) {
  var sql = "SELECT * FROM userdata";
  db.query(sql, function (err, data, fields) {
    if (err) throw err;
    res.render("recents", { title: "User List", userData: data });
  });
});

app.get("/remote", imageController.displayImage);

const port = process.env.port;
app.listen(port, () => console.log(`Server has started on port ${port}... `));
