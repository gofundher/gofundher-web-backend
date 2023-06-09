"use strict";

module.exports = function(app) {
  // FACEBOOK SHARE LINK
  app.get("/facebook-share", async function(req, res) {
    const title = req.query.title.replace(/_/g, " ");
    const description = req.query.description;
    const image =
      (req.query || {}).image ||
      "https://s3.amazonaws.com/hope.bucket.test/f43a9a33-c051-4c44-9208-ed71c97cc07a.jpg";
    const userId = req.query.userId;
    let uri;
    if (image) {
      uri =
        "https://cofundher.com/facebook-share?title=" +
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
        message: "Title required"
      });
    }

    if (!description) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Description required"
      });
    }

    if (!image) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Image required"
      });
    }

    return res.render("pages/index", {
      title,
      description,
      image,
      url
    });
  });
};
