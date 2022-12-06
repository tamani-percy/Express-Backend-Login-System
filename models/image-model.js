var db = require("../dbServer");
module.exports = {
  displayImage: function (callback) {
    // check unique email address
    var sql = "SELECT mask_status FROM userdata";
    db.query(sql, function (err, data, fields) {
      if (err) throw err;
      return callback(data);
    });
  },
};
