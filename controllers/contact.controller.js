const emailSender = require("../helpers/mailSender");
const Sequelize = require("sequelize");

const createContact = async (req, res) => {
  const data = req.body;

  try {
    if (!data.name || !data.email || !data.message) {
      res.send(400).send({ success: false, message: "Please fill all fields" });
    } else {
      await new emailSender().sendMail(
        ['info@gofundher.com'],
        "[Gofundher] Contact us query",
        " ",
        "GoFundHer",
        " ",
        "contactus",
        {
          name: data.name,
          email: data.email,
          message: data.message
        },
        true
      );
      res.status(200).json({
        message:"Contact Created"
      })
    }
  } catch (error) {
    console.log(error);
    res.json({ message: error.message });
  }
};

module.exports = {
  createContact,
};
