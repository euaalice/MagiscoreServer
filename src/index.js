const express = require('express');
require('dotenv').config()
const body_parser = require('body-parser');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose')

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://euaalice:Felice4646@magiscluster.g1ev3bp.mongodb.net/", {
  
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error))


app.use(body_parser.json());
app.use(body_parser.urlencoded({extended:true, limit:'50mb'}))
app.use(cors());

require("./app/controllers/controller")(app);
//require("./app/controllers/controller_sobre")(app);


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});