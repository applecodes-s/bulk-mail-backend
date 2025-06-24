const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require("cors");

app.use(cors({
  origin: "https://bulk-mail-frontend-chi.vercel.app",
  methods: ["GET", "POST"],
  credentials: true,
}));


app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb+srv://applecodes:123@cluster0.gvfpoq7.mongodb.net/passkey?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("DB Connected"))
  .catch(() => console.log("Failed to connect to DB"));

// Define the model
const credentialsSchema = new mongoose.Schema({
  user: String,
  pass: String
}, { collection: 'bulkmail' });

const Credential = mongoose.model("Credential", credentialsSchema);

// Test route
app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// Route to send email
app.post("/sendemail", async (req, res) => {
  const { msg, emailList, subject } = req.body;

  if (!msg || !emailList || !subject) {
    return res.status(400).send("Missing required fields");
  }

  try {
    const data = await Credential.find();
    console.log("User:", data[0].user);
    console.log("Pass:", data[0].pass);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: data[0].user,
        pass: data[0].pass
      }
    });

    const mailOptions = {
      from: data[0].user,
      to: emailList, // should be comma-separated string or array
      subject: subject,
      text: msg
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send("Emails sent successfully!");
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).send("Failed to send emails.");
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
