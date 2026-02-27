

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { join } from 'path';
import { Replace } from "../utils/replace.util";

const transporter = nodemailer.createTransport({
    host: "mail.acyde.net",
    port: 465,
    secure: true,
    auth: {
      user: "notifications@acyde.net",
      pass: "hOEh]RD#GGsp"
    },
});

// let transporter;

// (async () => {
//   let testAccount = await nodemailer.createTestAccount();

//   // create reusable transporter object using the default SMTP transport
//   transporter = nodemailer.createTransport({
//     host: "smtp.ethereal.email",
//     port: 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: testAccount.user, // generated ethereal user
//       pass: testAccount.pass, // generated ethereal password
//     },
//   });
// })()

@Injectable()
export class NodemailerService {

  constructor(
  ) { }


  async sendEmail(to: string, subject: string, template: string, attributes: any) {
    const templateRaw = readFileSync(join(__dirname, `../assets/template/${template}.html`)).toString();
    let info = await transporter.sendMail({
      from: '"Notification Acyde" <notifications@acyde.net>',
      to: to,
      subject: subject,
      html: Replace.replaceKeywords(templateRaw, attributes)
    });
  }

}
