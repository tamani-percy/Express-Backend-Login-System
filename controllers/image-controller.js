var multer = require("multer");
var imageModel = require("../models/image-model");

module.exports = {
  displayImage: function (req, res) {
    imageModel.displayImage(function (data) {
      res.render("recents", { imagePath: data });
    });
  },
};
