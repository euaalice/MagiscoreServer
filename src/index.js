const express = require('express');
require('dotenv').config()
const body_parser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Configurar sessões para Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'seu_secret_aqui_mude_isso',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

require("./app/controllers/controller")(app);
require("./app/controllers/controller_auth")(app);
//require("./app/controllers/controller_sobre")(app);


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});