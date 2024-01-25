/** @format */

"use strict";

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const env = process.env.NODE_ENV || "development";
const bodyParser = require("body-parser");
const dotenv = require("dotenv-flow");
dotenv.config();
// ROUTE IMPORTS
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/user.router");
const authRouter = require("./routes/auth.router");
const uploadRouter = require("./routes/upload.router");
const projectRouter = require("./routes/project.router");
const profileRouter = require("./routes/profile.router");
const donationRouter = require("./routes/donation.router");
const paymentRouter = require("./routes/payment.router");
const adminRouter = require("./routes/admin.router");
const newsLetterRouter = require("./routes/newsLetter.router");
const contactRouter = require("./routes/contact.router");
const models = require("./models");
const { FrontendUrl } = require("./constants");
const app = express();
const unirest = require("unirest");
const Bugsnag = require('@bugsnag/js')
const BugsnagPluginExpress = require('@bugsnag/plugin-express')

Bugsnag.start({
  apiKey: '0a1bfdb0b1b641962503ee763e3c65de',
  plugins: [BugsnagPluginExpress]
});

const middleware = Bugsnag.getPlugin('express')
app.use(middleware.requestHandler)
const passport = require("passport");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false, limit: "100MB" }));
app.use(logger("dev"));
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: false, limit: "100MB" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "build"))); // serving front end build
app.use("/admin", express.static(path.join(__dirname, "admin"))); // serving admin end build
app.use(express.static(path.join(__dirname, "public"))); // serving static files

// ROUTES
const rootPath = "/api";
app.use("/auth", authRouter);
app.use(`${rootPath}/`, indexRouter);
app.use(`${rootPath}/users`, usersRouter);
app.use(`${rootPath}/uploads`, uploadRouter);
app.use(`${rootPath}/projects`, projectRouter);
app.use(`${rootPath}/profile`, profileRouter);
app.use(`${rootPath}/donations`, donationRouter);
app.use(`${rootPath}/payment`, paymentRouter);
app.use(`${rootPath}/admin`, adminRouter);
app.use(`${rootPath}/newsLetter`, newsLetterRouter);
app.use(`${rootPath}/contact`, contactRouter);

// ********************************Linkedin login********************************
app.get("/linkedin", passport.authenticate("linkedin"));
app.get(
  "/callback",
  passport.initialize(),
  passport.authenticate("linkedin", {
    failureRedirect: `${FrontendUrl}/login`,
  }),
  (error, req, res, next) => {
    if (error) {
      // Handle the error when the user cancelled the authorization
      return res.redirect(`${FrontendUrl}/login`);
    }
  },
  function (req, res) {
    return res.redirect(
      `${FrontendUrl}/verify-user?token=${req.user.token}&userId=${req.user.id}`
    );
  }
);

// *********************************Google Login***********************************
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "https://www.googleapis.com/auth/plus.login",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  })
);
app.get(
  "/auth/google/callback",
  passport.initialize(),
  passport.authenticate("google", { failureRedirect: `/login` }),
  function (req, res) {
    if (!req.user.token) {
      return res.redirect(`${FrontendUrl}/login`);
    }
    return res.redirect(
      `${FrontendUrl}/verify-user?token=${req.user.token}&userId=${req.user.id}`
    );
  }
);

//****************************************Social Share***************************
app.get("/social-share", async function (req, res) {
  // query params
  const title = req.query.title.replace(/_/g, " ");
  const description = req.query.description.replace(/_/g, " ");
  const projectUrl = req.query.url;
  const image = req.query.image;
  let uri;
  if (image) {
    uri =
      "https://cashfundher.com/social-share?title=" +
      req.query.title +
      "&description=" +
      req.query.description +
      "&image=" +
      image;
  }

  const url = uri;

  if (!title) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Title required",
    });
  }

  if (!description) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Description required",
    });
  }

  if (!image) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Image required",
    });
  }
  return res.render("pages/index", {
    title,
    description,
    image,
    url,
    projectUrl,
  });
});

//****************************************Instagram feeds***************************
app.get("/api/fetch-instagram-feed", async function (req, res) {
  let instagramReq = unirest(
    "GET",
    "https://www.instagram.com/_cashfundher/?__a=1"
  );

  instagramReq.headers({
    "Postman-Token": "dddb599e-81cb-45a5-bd42-023bf926cf4a",
    "cache-control": "no-cache",
  });

  instagramReq.end(function (instagramResponse) {
    if (instagramResponse.error) throw new Error(instagramResponse.error);
    return res.status(200).json({
      responseCode: 200,
      message: "Instagram feeds fetched successfully",
      data: instagramResponse.body,
      success: true,
    });
  });
});

app.get("/admin", function ({}, res) {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});
app.get("/admin/*", function ({}, res) {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});
app.get(/^\/(?!api|phpmyadmin).*/, function ({}, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// catch 404 and forward to error handler
app.use(function ({}, {}, next) {
  next(createError(404));
});

// sync database
models.sequelize
  .sync()
  .then(function () {})
  .catch(function (err) {});
// error handler
app.use(middleware.errorHandler);
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  console.log(err);
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
  next();
});

module.exports = app;
