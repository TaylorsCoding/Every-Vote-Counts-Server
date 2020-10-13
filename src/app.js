require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");

const authRouter = require("./routers/auth-router");
const usersRouter = require("./routers/users-router");

const app = express();

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello Express!");
});

// These are all the express routers that this app has been designated to use
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

// This function sends errors to the client when they appear in development mode
// and production mode.
app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "production") {
    response = { error: { message: error.message } };
  } else {
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
