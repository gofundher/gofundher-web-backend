const passport = require("passport");
const { FrontendUrl } = require("../constants");

const facebookAuth =  passport.authenticate("facebook", {
    scope: ["public_profile", "email"],
  });

const facebookCallback = async (req, res) => {
    if (!req.user?.token) {
      return res.redirect(`${FrontendUrl}/login`);
    }

    return res.redirect(
      `${FrontendUrl}/verify-user?token=${req.user.token}&userId=${req.user.id}`
    );
}

module.exports = {
    facebookCallback,
    facebookAuth
}