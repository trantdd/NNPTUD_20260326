var express = require("express");
var router = express.Router();
let {
  validatedResult,
  CreateUserValidator,
  ModifyUserValidator,
} = require("../utils/validator");
let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let userController = require("../controllers/users");
const { checkLogin, checkRole } = require("../utils/authHandler");
const { sendPasswordMail } = require("../utils/mailHandler");
const multer = require("multer");
const ExcelJS = require("exceljs");
const crypto = require("crypto");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, "import_users_" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx" && ext !== ".xls") {
      return cb(new Error("Only Excel files are allowed"));
    }
    cb(null, true);
  },
});

router.get(
  "/",
  checkLogin,
  checkRole("ADMIN", "MODERATOR"),
  async function (req, res, next) {
    let users = await userModel.find({ isDeleted: false });
    res.send(users);
  },
);

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel.find({ _id: req.params.id, isDeleted: false });
    if (result.length > 0) {
      res.send(result);
    } else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post(
  "/",
  CreateUserValidator,
  validatedResult,
  async function (req, res, next) {
    try {
      let newUser = await userController.CreateAnUser(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role,
        req.body.fullname,
        req.body.avatarUrl,
      );
      res.send(newUser);
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  },
);

router.put(
  "/:id",
  ModifyUserValidator,
  validatedResult,
  async function (req, res, next) {
    try {
      let id = req.params.id;
      let updatedItem = await userModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      if (!updatedItem)
        return res.status(404).send({ message: "id not found" });

      let populated = await userModel.findById(updatedItem._id);
      res.send(populated);
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  },
);

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});
// POST /api/v1/users/import — import users from Excel file (columns: username, email)
router.post(
  "/import",
  checkLogin,
  checkRole("ADMIN"),
  upload.single("file"),
  async function (req, res, next) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send({ message: "Vui lòng upload file Excel (.xlsx)" });
      }

      // Find the "USER" role
      const userRole = await roleModel.findOne({
        name: { $regex: /^user$/i },
        isDeleted: false,
      });
      if (!userRole) {
        return res
          .status(400)
          .send({ message: "Không tìm thấy role USER trong hệ thống" });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.worksheets[0];

      // Detect header row
      const headerRow = worksheet.getRow(1);
      const headers = {};
      headerRow.eachCell((cell, colNumber) => {
        headers[cell.value?.toString().toLowerCase().trim()] = colNumber;
      });

      if (!headers["username"] || !headers["email"]) {
        return res
          .status(400)
          .send({ message: "File Excel phải có cột 'username' và 'email'" });
      }

      const results = { success: [], failed: [] };

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const username = row
          .getCell(headers["username"])
          .value?.toString()
          .trim();
        const email = row.getCell(headers["email"]).value?.toString().trim();

        if (!username || !email) continue;

        try {
          // Generate random 16-character password (letters + digits)
          const rawPassword = crypto
            .randomBytes(12)
            .toString("base64")
            .slice(0, 16);

          const newUser = await userController.CreateAnUser(
            username,
            rawPassword,
            email,
            userRole._id,
            undefined,
            undefined,
            undefined,
            false,
            0,
          );

          // Send email with the plain-text password (before hashing)
          await sendPasswordMail(email, username, rawPassword);

          results.success.push({ username, email });
        } catch (err) {
          results.failed.push({ username, email, reason: err.message });
        }
      }

      res.send({
        message: `Import hoàn thành. Thành công: ${results.success.length}, Thất bại: ${results.failed.length}`,
        success: results.success,
        failed: results.failed,
      });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  },
);
module.exports = router;
