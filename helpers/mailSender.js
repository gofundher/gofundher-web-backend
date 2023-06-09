"use strict";

const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
class emailSender {
  /*
   *Construtor for Class Email
   * @params - nothing
   * @return - void
   * @example - new Email()
   */
  constructor() {
    this.subject = "";
    this.body = "";
    this.to = [];
    this.senderName = "Chapter247";
  }
  /*
   * setSubject - sets the subject for email
   * @params - subject(string)
   * @return - Email Class Instance
   * @example - ('This is test subject for email')
   */
  setSubject(subject) {
    this.subject = subject;
    return this;
  }
  /*
   * setBody - sets the body for email
   * @params - body(string | html)
   * @return - Email Class Instance
   * @example - ('This is test <b>body</b> for email')
   */
  setBody(body) {
    this.body = body;
    return this;
  }
  setCC(cc) {
    this.cc = cc;
  }
  /*
   * setReciepent - sets the reciepent email on which email need to send
   * @params - to(string | string[])
   * @return - Email Class Instance
   * @example - (['test.chapter247@gmail.com'])
   */
  setReciepent(to) {
    this.to = to;
    return this;
  }
  /*
   * setSenderName - sets the sender name to show on email
   * @params - setSenderName(string)
   * @return - Email Class Instance
   * @example - ('Chapter247 Infotech')
   */

  setSenderName(name) {
    this.senderName = name;
    return this;
  }
  /*
   * sendMail - sets reciepent email on which email need to send, sets the subject for email, sets the body for email,  the sender name to show on email
   * @params - sendMail(to(optional): string[] | string, subject(optional): string, body(optional): string | html, senderName(optional): string)
   * @return - response of email
   * @example - () | ('test.chapter247@gmail.com', 'test subject', 'test <b>body</b>', 'Chapter247')
   */
  async sendMail(
    to = [],
    subject = "",
    body = "",
    senderName = "",
    cc = "",
    templateName = "",
    replaceObject = "",
    dynamic = false
  ) {
    if (to.length) {
      this.to = to;
    }
    if (subject) {
      this.subject = subject;
    }
    if (body) {
      this.body = body;
    }
    if (senderName) {
      this.senderName = senderName;
    }
    if (cc) {
      this.cc = cc;
    }
    if (templateName) {
      this.templateName = templateName;
    }
    if (dynamic) {
      let content = fs.readFileSync(
        path.join(__dirname, `./../emailtemplates/${templateName}.html`),
        "utf8"
      );
      for (const key in replaceObject) {
        if (replaceObject.hasOwnProperty(key)) {
          const val = replaceObject[key];
          content = content.replace(new RegExp(`{${key}}`, "g"), val);
        }
      }
      this.body = content;
    }
    if (this.to.length == 0) {
      throw new Error("Please set reciepent email");
    }
    if (this.subject.trim() == "") {
      throw new Error("Please set subject");
    }
  
    let transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    const toOverride = process.env.NODE_ENV !== 'production' ? ['dev@cofundher.com', 'mouhsine.bakhich@gmail.com'] : this.to;
    const ccOverride = process.env.NODE_ENV !== 'production' ? ['dev@cofundher.com', 'mouhsine.bakhich@gmail.com'] : this.cc;
    
    console.log({toOverride});

    let mailOptions = {
      from: `${this.senderName} <info@cofundher.com>`, // sender address
      to: toOverride, // list of receivers
      cc: ccOverride,
      subject: this.subject,
      html: this.body,
    };
    // send mail with defined transport object
    return await transporter.sendMail(mailOptions);
  }
}

module.exports = emailSender;
