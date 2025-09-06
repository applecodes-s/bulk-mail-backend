require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS setup
app.use(cors({
  origin: [
    "https://bulk-mail-frontend-chi.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// ✅ Multer setup for attachments
const upload = multer({ dest: "uploads/" });

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ DB Connected"))
  .catch((err) => console.log("❌ DB Connection Error:", err));

// ✅ Schema to save emails
const emailSchema = new mongoose.Schema({
  subject: String,
  body: String,
  recipients: [String],
  status: String,
  createdAt: { type: Date, default: Date.now },
});
const Email = mongoose.model("Email", emailSchema);

// ✅ Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// ✅ Route to send emails with optional attachments
app.post("/sendemail", upload.array("attachments"), async (req, res) => {
  const { subject, msg, recipients } = req.body;

  if (!subject || !msg || !recipients) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const recipientList = recipients.split(",").map(e => e.trim());

  const attachments = (req.files || []).map(file => ({
    filename: file.originalname,
    path: path.resolve(file.path),
  }));

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientList.join(","),
    subject,
    text: msg,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);

    await new Email({ subject, body: msg, recipients: recipientList, status: "success" }).save();

    // Clean up uploaded files
    req.files?.forEach(file => fs.unlink(file.path, err => {
      if (err) console.error("Cleanup failed:", file.path);
    }));

    res.json({ success: true, message: "Emails sent successfully" });
  } catch (error) {
    console.error("❌ Error sending email:", error);

    await new Email({ subject, body: msg, recipients: recipientList, status: "failure" }).save();

    // Clean up uploaded files
    req.files?.forEach(file => fs.unlink(file.path, err => {
      if (err) console.error("Cleanup failed:", file.path);
    }));

    res.status(500).json({ success: false, message: "Failed to send emails", error: error.message });
  }
});

// ✅ Start server
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
