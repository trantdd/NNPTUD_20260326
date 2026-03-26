const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 25,
  secure: false, // Use true for port 465, false for port 587
  auth: {
    user: "",
    pass: "",
  },
});
module.exports = {
  sendMail: async function (to, url) {
    const info = await transporter.sendMail({
      from: "hehehe@gmail.com",
      to: to,
      subject: "reset password URL",
      text: "click vao day de doi pass", // Plain-text version of the message
      html: "click vao <a href=" + url + ">day</a> de doi pass", // HTML version of the message
    });

    console.log("Message sent:", info.messageId);
  },

  sendPasswordMail: async function (to, username, password) {
    const info = await transporter.sendMail({
      from: "hehehe@gmail.com",
      to: to,
      subject: "Thông tin tài khoản của bạn",
      text: `Xin chào ${username},\n\nTài khoản của bạn đã được tạo.\nMật khẩu: ${password}\n\nVui lòng đổi mật khẩu sau khi đăng nhập.`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.5; color: #222;">
  <h2 style="margin-bottom: 12px;">Tài khoản đã được tạo</h2>
  <img src="cid:welcome-image" alt="Welcome" style="display:block; width:100%; max-width:360px; border-radius:8px; margin: 0 auto 16px;" />
  <p>Xin chào <b>${username}</b>,</p>
  <p>Tài khoản của bạn đã được tạo thành công.</p>
  <p>Mật khẩu: <b>${password}</b></p>
  <p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>
</div>`,
      attachments: [
        {
          filename: "welcome.png",
          path: "https://i.sstatic.net/l60Hf.png",
          cid: "welcome-image",
        },
      ],
    });

    console.log("Password mail sent:", info.messageId);
  },
};
