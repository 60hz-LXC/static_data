const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
require('dotenv').config();

const app = express();
const cors = require('cors')

app.use(cors())

// Configure app to use bodyParser()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Setup the MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connect to the database
db.connect(function (err) {
  if (err) throw err;
  console.log("Connected to the database!");
});

app.post('/api/saveUserData', (req, res) => {
  let { ip_address, region, country, browser, operating_system, language, screenWidth, screenHeight, timezoneOffset, referrer } = req.body;
  referrer = referrer.substring(referrer.lastIndexOf('/')+1); // Get the page slug
  console.log("Received request with data:", req.body);

  // Check if the same IP has visited within the last two hours
  const checkSql = "SELECT * FROM user_data WHERE ip_address = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 2 HOUR)";
  
  db.query(checkSql, [ip_address], (err, result) => {
    if (err) {
      console.error("Error querying the database during check:", err);
      res.status(500).json({ message: "Error querying the database during check" });
    }

    if (result.length > 0) {
      // If the user has visited within the last two hours, update their record
      const updateSql = "UPDATE user_data SET pageViews = pageViews+1, pageReferrers = CONCAT(pageReferrers, ' -> ', ?) WHERE ip_address = ?";

      db.query(updateSql, [referrer, ip_address], (err, result) => {
        if (err) {
          console.error("Error updating the database:", err);
          res.status(500).json({ message: "Error updating the database" });
        } else {
          console.log("User record updated successfully");
          res.json({ message: "User record updated successfully" });
        }
      });
    } else {
      // If the user hasn't visited within the last two hours or is new, create a new record
      const insertSql = "INSERT INTO user_data (ip_address, region, country, browser, operating_system, language, screenWidth, screenHeight, timezoneOffset, referrer, pageViews, pageReferrers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)";
      db.query(insertSql, [ip_address, region, country, browser, operating_system, language, screenWidth, screenHeight, timezoneOffset, referrer, referrer], (err, result) => {
        if (err) {
          console.error("Error inserting to the database:", err);
          res.status(500).json({ message: "Error inserting to the database" });
        } else {
          console.log("Inserted a new user record successfully");
          res.json({ message: "Inserted a new user record successfully" });
        }
      });
    }
  });
});

app.listen(3000, function () {
  console.log("Server is running on port 3000");
});