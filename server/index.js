
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const multer = require("multer");
require("dotenv").config();

const app = express();
const PORT = 5000;

// Enable CORS for frontend access
const corsOptions = {
    origin: "http://localhost:3000", // Your frontend URL
    methods: "GET,POST",
    allowedHeaders: "Content-Type",
  };
  app.use(cors(corsOptions));
  
// app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Ensure tokens directory exists
const tokensDir = path.join(__dirname, "tokens");
if (!fs.existsSync(tokensDir)) {
  fs.mkdirSync(tokensDir);
}

// Google OAuth2 Client
const credentials = require("../server/client_secret_767304809265-4suvugorjkp2to0a5nu4dg3htbkjoq70.apps.googleusercontent.com.json");
const { client_secret, client_id, redirect_uris } = credentials.installed;

// Create OAuth2 client
function getOAuthClient() {
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

// Get Auth URL
app.get("/auth/url", (req, res) => {
  const oAuth2Client = getOAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/userinfo.email"],
    prompt: "consent" // Force consent screen to appear every time
  });
  
  res.json({ url: authUrl });
});

// Handle OAuth callback
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing auth code" });

  try {
    const oAuth2Client = getOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Get user email from token
    oAuth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: 'v2'
    });
    
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;
    
    if (!userEmail) {
      return res.status(400).json({ error: "Could not retrieve user email" });
    }
    
    // Sanitize email for filename
    const safeEmail = userEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const tokenPath = path.join(tokensDir, `${safeEmail}.json`);
    
    // Save token with email as filename
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));
    
    res.json({ 
      message: "Authentication successful!",
      email: userEmail
    });
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Upload file endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "No email provided" });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Sanitize email for filename
  const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
  const tokenPath = path.join(tokensDir, `${safeEmail}.json`);
  
  if (!fs.existsSync(tokenPath)) {
    return res.status(401).json({ error: "Not authenticated. Please login first." });
  }

  try {
    const tokens = JSON.parse(fs.readFileSync(tokenPath));
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials(tokens);
    
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const fileMetadata = { name: req.file.originalname };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      message: `File uploaded to account: ${email}`,
      fileId: file.data.id
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Check if a user is authenticated
app.get("/check-auth/:email", (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ authenticated: false });
  }
  
  const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
  const tokenPath = path.join(tokensDir, `${safeEmail}.json`);
  
  const isAuthenticated = fs.existsSync(tokenPath);
  res.json({ authenticated: isAuthenticated });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));











// const express = require("express");
// const cors = require("cors");
// const fs = require("fs");
// const path = require("path");
// const { google } = require("googleapis");
// const multer = require("multer");
// require("dotenv").config();

// const app = express();
// const PORT = 5000;

// // Enable CORS for frontend access
// app.use(cors());
// app.use(express.json());

// // Configure Multer for file uploads
// const upload = multer({ dest: "uploads/" });

// // Google OAuth2 Client
// const credentials = require("../server/client_secret_767304809265-4suvugorjkp2to0a5nu4dg3htbkjoq70.apps.googleusercontent.com.json");
// const { client_secret, client_id, redirect_uris } = credentials.installed;

// // OAuth2 Client Setup
// const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
// // Scopes - Limited to files created by this app
// const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// // Load or Generate Token
// app.get("/auth/url", (req, res) => {
//     const authUrl = oAuth2Client.generateAuthUrl({
//         access_type: "offline",
//         scope: SCOPES,
//     });
//     res.json({ url: authUrl });
// });

// // Exchange Auth Code for Token
// app.get("/auth/callback", async (req, res) => {
//     const code = req.query.code;
//     if (!code) return res.status(400).json({ error: "Missing auth code" });

//     try {
//         const { tokens } = await oAuth2Client.getToken(code);
//         fs.writeFileSync("token.json", JSON.stringify(tokens));
//         res.json({ message: "Authentication successful!" });
//     } catch (err) {
//         res.status(500).json({ error: "Authentication failed" });
//     }
// });

// // Upload File to Google Drive
// app.post("/upload", upload.single("file"), async (req, res) => {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     try {
//         const creds = JSON.parse(fs.readFileSync("token.json"));
//         oAuth2Client.setCredentials(creds);
//         const drive = google.drive({ version: "v3", auth: oAuth2Client });

//         const fileMetadata = { name: req.file.originalname };
//         const media = { mimeType: req.file.mimetype, body: fs.createReadStream(req.file.path) };

//         const file = await drive.files.create({
//             resource: fileMetadata,
//             media: media,
//             fields: "id",
//         });

//         fs.unlinkSync(req.file.path);
//         res.json({ message: "File uploaded!", fileId: file.data.id });
//     } catch (err) {
//         res.status(500).json({ error: "Upload failed" });
//     }
// });

// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

























// const fs = require("fs");
// const path = require("path");
// const { google } = require("googleapis");
// const express = require("express");
// const multer = require("multer");

// const app = express();
// const PORT = 3000;

// // Load credentials
// const credentials = require("../Wcloudapp/client_secret_767304809265-4suvugorjkp2to0a5nu4dg3htbkjoq70.apps.googleusercontent.com.json");
// const { client_secret, client_id, redirect_uris } = credentials.installed;

// // OAuth2 Client Setup
// const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// // Scopes - Limited to files created by this app
// const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// // Multer Setup for File Uploads
// const upload = multer({ dest: "uploads/" });

// // Load or Generate Token
// function authenticate() {
//     const tokenPath = path.join(__dirname, "token.json");

//     if (fs.existsSync(tokenPath)) {
//         const token = fs.readFileSync(tokenPath, "utf8");
//         oAuth2Client.setCredentials(JSON.parse(token));
//         console.log("Authenticated using existing token.");
//     } else {
//         const authUrl = oAuth2Client.generateAuthUrl({
//             access_type: "offline",
//             scope: SCOPES,
//         });

//         console.log("Authorize this app by visiting this URL:", authUrl);
//     }
// }

// // Exchange Auth Code for Token
// app.get("/auth/callback", async (req, res) => {
//     const code = req.query.code;
//     if (!code) return res.send("Missing authorization code");

//     try {
//         const { tokens } = await oAuth2Client.getToken(code);
//         oAuth2Client.setCredentials(tokens);
//         fs.writeFileSync("token.json", JSON.stringify(tokens));
//         res.send("Authentication successful! You can now upload files.");
//     } catch (err) {
//         res.status(500).send("Error authenticating: " + err.message);
//     }
// });

// // Upload Local File to Google Drive
// async function uploadFile(filePath, fileName) {
//     const drive = google.drive({ version: "v3", auth: oAuth2Client });

//     const fileMetadata = { name: fileName };
//     const media = { mimeType: "application/octet-stream", body: fs.createReadStream(filePath) };

//     const file = await drive.files.create({
//         resource: fileMetadata,
//         media: media,
//         fields: "id",
//     });

//     console.log("File uploaded successfully! File ID:", file.data.id);
// }

// // API Route: Upload File from Client
// app.post("/upload", upload.single("file"), async (req, res) => {
//     console.log("hiiiii");
//     if (!req.file) return res.status(400).send("No file uploaded.");

//     try {
//         await uploadFile(req.file.path, req.file.originalname);
//         fs.unlinkSync(req.file.path); // Delete local temp file
//         res.send("File uploaded successfully!");
//     } catch (err) {
//         res.status(500).send("Error uploading file: " + err.message);
//     }
// });

// // Upload JSON Data Directly
// async function uploadJSONData(data, fileName = "user_data.json") {
//     const drive = google.drive({ version: "v3", auth: oAuth2Client });

//     const fileMetadata = { name: fileName };
//     const media = {
//         mimeType: "application/json",
//         body: JSON.stringify(data),
//     };

//     const file = await drive.files.create({
//         resource: fileMetadata,
//         media: media,
//         fields: "id",
//     });

//     console.log("JSON data uploaded successfully! File ID:", file.data.id);
// }

// // API Route: Upload JSON Data
// app.post("/upload-json", express.json(), async (req, res) => {
//     if (!req.body) return res.status(400).send("No JSON data received.");

//     try {
//         await uploadJSONData(req.body);
//         res.send("JSON data uploaded successfully!");
//     } catch (err) {
//         res.status(500).send("Error uploading JSON: " + err.message);
//     }
// });

// // Start Server
// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
//     authenticate();
// });
























