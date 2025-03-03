
import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // Import the custom CSS animations

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // On component mount, check local storage for a saved email and verify authentication.
  useEffect(() => {
    const storedEmail = localStorage.getItem("driveUploaderEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      checkAuthentication(storedEmail);
    }
  }, []);

  // Check if the user is authenticated by calling the backend.
  const checkAuthentication = async (emailToCheck) => {
    if (!emailToCheck) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/check-auth/${encodeURIComponent(emailToCheck)}`
      );
      console.log("Authentication response:", res.data);
      setIsAuthenticated(res.data.authenticated);
      if (res.data.authenticated) {
        setMessage(`Authenticated as ${emailToCheck}`);
      } else {
        setMessage("Not authenticated yet. Please complete the authentication popup.");
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
      setMessage("Error checking authentication status");
    }
  };

  // Start the Google OAuth authentication process via a popup.
  const startAuthentication = async () => {
    if (!email) {
      setMessage("Please enter your email address first");
      return;
    }

    setIsLoading(true);
    setMessage("Starting authentication process...");

    try {
      const res = await axios.get("http://localhost:5000/auth/url");
      console.log("Google Auth URL received:", res.data.url);
      if (!res.data.url) {
        setMessage("Failed to retrieve authentication URL. Check server logs.");
        setIsLoading(false);
        return;
      }

      // Save the email to local storage for later use.
      localStorage.setItem("driveUploaderEmail", email.trim());

      // Open the authentication URL in a popup window.
      const authWindow = window.open(
        res.data.url,
        "googleAuthWindow",
        "width=600,height=700"
      );

      if (!authWindow || authWindow.closed || typeof authWindow.closed === "undefined") {
        setMessage("Popup was blocked! Please allow popups for this site and try again.");
        setIsLoading(false);
        return;
      }

      // Polling the popup: If it is closed, or after a max timeout, verify authentication.
      const pollTimer = setInterval(() => {
        try {
          if (authWindow.closed) {
            clearInterval(pollTimer);
            setMessage("Popup closed. Verifying authentication...");
            checkAuthentication(email);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error polling popup:", error);
        }
      }, 1000);

      // Also, force-close the popup after 20 seconds if it hasn't been closed.
      setTimeout(() => {
        if (authWindow && !authWindow.closed) {
          authWindow.close();
          clearInterval(pollTimer);
          setMessage("Authentication popup closed automatically. Verifying...");
          checkAuthentication(email);
          setIsLoading(false);
        }
      }, 20000);
    } catch (error) {
      console.error("Error starting authentication:", error);
      setMessage("Failed to start authentication process.");
      setIsLoading(false);
    }
  };

  // Handle email input changes.
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  // Handle file input changes.
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setMessage(e.target.files[0] ? `Selected file: ${e.target.files[0].name}` : "");
  };

  // Upload the file to the backend.
  const uploadFile = async () => {
    if (!selectedFile) {
      setMessage("Please select a file first");
      return;
    }

    if (!email || !isAuthenticated) {
      setMessage("Please authenticate with Google first");
      return;
    }

    setIsLoading(true);
    setMessage("Uploading file...");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("email", email);

    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.message || "File uploaded successfully!");
      setSelectedFile(null);

      // Reset the file input element.
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload failed:", error);
      setMessage(`Upload failed: ${error.response?.data?.error || "Unknown error"}`);
    }

    setIsLoading(false);
  };

  // Logout: clears state and local storage.
  const handleLogout = () => {
    setEmail("");
    setIsAuthenticated(false);
    setSelectedFile(null);
    localStorage.removeItem("driveUploaderEmail");
    setMessage("Logged out successfully");

    // Reset the file input element.
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-200 flex flex-col items-center justify-center p-6 fadeIn">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8 drop-shadow-lg">
        Google Drive Uploader
      </h1>

      {/* Email Input */}
      <div className="w-full max-w-md mb-6">
        <label className="block text-gray-700 text-lg font-medium mb-2">
          Your Google Email:
        </label>
        <div className="flex shadow-md">
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="example@gmail.com"
            className="flex-1 p-4 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            onClick={() => checkAuthentication(email)}
            disabled={!email || isLoading}
            className={`px-6 py-4 ${
              !email || isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-500 hover:bg-indigo-600"
            } text-white font-semibold rounded-r transition-transform transform hover:scale-105`}
          >
            Verify
          </button>
        </div>
      </div>

      {/* Authentication Status */}
      <div
        className={`w-full max-w-md p-6 mb-6 rounded-lg shadow-lg transition-colors ${
          isAuthenticated
            ? "bg-green-100 border border-green-400"
            : "bg-yellow-100 border border-yellow-400"
        }`}
      >
        <p className={`text-xl font-medium ${isAuthenticated ? "text-green-800" : "text-yellow-800"}`}>
          {isAuthenticated ? `Authenticated as: ${email}` : "Not authenticated"}
        </p>
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="mt-4 px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-full shadow-xl hover:from-red-600 hover:to-red-700 transition transform hover:scale-105 bounceIn"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={startAuthentication}
            disabled={isLoading || !email}
            className={`mt-4 px-8 py-3 ${
              isLoading || !email
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white font-bold rounded shadow-lg transition transform hover:scale-105`}
          >
            {isLoading ? "Loading..." : "Authenticate with Google"}
          </button>
        )}
      </div>

      {/* File Upload Section */}
      <div className="w-full max-w-md mb-6">
        <input
          id="file-input"
          type="file"
          onChange={handleFileChange}
          className="w-full p-4 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          disabled={!isAuthenticated}
        />
        <button
          onClick={uploadFile}
          disabled={isLoading || !isAuthenticated || !selectedFile}
          className={`w-full px-8 py-4 ${
            isLoading || !isAuthenticated || !selectedFile
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-500 hover:bg-purple-600"
          } text-white font-bold rounded shadow-lg transition transform hover:scale-105`}
        >
          {isLoading ? "Uploading..." : "Upload File"}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className="w-full max-w-md p-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-medium text-lg fadeIn">
          {message}
        </div>
      )}
    </div>
  );
}

export default App;


// import { useState, useEffect } from "react";
// import axios from "axios";

// function App() {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [message, setMessage] = useState("");
//   const [email, setEmail] = useState("");
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);

//   // On component mount, check local storage for a saved email and verify authentication.
//   useEffect(() => {
//     const storedEmail = localStorage.getItem("driveUploaderEmail");
//     if (storedEmail) {
//       setEmail(storedEmail);
//       checkAuthentication(storedEmail);
//     }
//   }, []);

//   // Check if the user is authenticated by calling the backend.
//   const checkAuthentication = async (emailToCheck) => {
//     if (!emailToCheck) return;
//     try {
//       const res = await axios.get(
//         `http://localhost:5000/check-auth/${encodeURIComponent(emailToCheck)}`
//       );
//       console.log("Authentication response:", res.data);
//       setIsAuthenticated(res.data.authenticated);
//       if (res.data.authenticated) {
//         setMessage(`Authenticated as ${emailToCheck}`);
//       } else {
//         setMessage("Not authenticated yet. Please complete the authentication popup.");
//       }
//     } catch (error) {
//       console.error("Error checking authentication:", error);
//       setIsAuthenticated(false);
//       setMessage("Error checking authentication status");
//     }
//   };

//   // Start the Google OAuth authentication process via a popup.
//   const startAuthentication = async () => {
//     if (!email) {
//       setMessage("Please enter your email address first");
//       return;
//     }

//     setIsLoading(true);
//     setMessage("Starting authentication process...");

//     try {
//       const res = await axios.get("http://localhost:5000/auth/url");
//       console.log("Google Auth URL received:", res.data.url);
//       if (!res.data.url) {
//         setMessage("Failed to retrieve authentication URL. Check server logs.");
//         setIsLoading(false);
//         return;
//       }

//       // Save the email to local storage for later use.
//       localStorage.setItem("driveUploaderEmail", email.trim());

//       // Open the authentication URL in a popup window.
//       const authWindow = window.open(
//         res.data.url,
//         "googleAuthWindow",
//         "width=600,height=700"
//       );

//       if (!authWindow || authWindow.closed || typeof authWindow.closed === "undefined") {
//         setMessage("Popup was blocked! Please allow popups for this site and try again.");
//         setIsLoading(false);
//         return;
//       }

//       // Polling the popup: If it is closed, or after a max timeout, verify authentication.
//       const pollTimer = setInterval(() => {
//         try {
//           if (authWindow.closed) {
//             clearInterval(pollTimer);
//             setMessage("Popup closed. Verifying authentication...");
//             checkAuthentication(email);
//             setIsLoading(false);
//           }
//         } catch (error) {
//           console.error("Error polling popup:", error);
//         }
//       }, 1000);

//       // Also, force-close the popup after 20 seconds if it hasn't been closed
//       setTimeout(() => {
//         if (authWindow && !authWindow.closed) {
//           authWindow.close();
//           clearInterval(pollTimer);
//           setMessage("Authentication popup closed automatically. Verifying...");
//           checkAuthentication(email);
//           setIsLoading(false);
//         }
//       }, 20000);
//     } catch (error) {
//       console.error("Error starting authentication:", error);
//       setMessage("Failed to start authentication process.");
//       setIsLoading(false);
//     }
//   };

//   // Handle email input changes.
//   const handleEmailChange = (e) => {
//     setEmail(e.target.value);
//   };

//   // Handle file input changes.
//   const handleFileChange = (e) => {
//     setSelectedFile(e.target.files[0]);
//     setMessage(e.target.files[0] ? `Selected file: ${e.target.files[0].name}` : "");
//   };

//   // Upload the file to the backend.
//   const uploadFile = async () => {
//     if (!selectedFile) {
//       setMessage("Please select a file first");
//       return;
//     }

//     if (!email || !isAuthenticated) {
//       setMessage("Please authenticate with Google first");
//       return;
//     }

//     setIsLoading(true);
//     setMessage("Uploading file...");

//     const formData = new FormData();
//     formData.append("file", selectedFile);
//     formData.append("email", email);

//     try {
//       const res = await axios.post("http://localhost:5000/upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setMessage(res.data.message || "File uploaded successfully!");
//       setSelectedFile(null);

//       // Reset the file input element.
//       const fileInput = document.getElementById("file-input");
//       if (fileInput) fileInput.value = "";
//     } catch (error) {
//       console.error("Upload failed:", error);
//       setMessage(`Upload failed: ${error.response?.data?.error || "Unknown error"}`);
//     }

//     setIsLoading(false);
//   };

//   // Logout: clears state and local storage.
//   const handleLogout = () => {
//     setEmail("");
//     setIsAuthenticated(false);
//     setSelectedFile(null);
//     localStorage.removeItem("driveUploaderEmail");
//     setMessage("Logged out successfully");

//     // Reset the file input element.
//     const fileInput = document.getElementById("file-input");
//     if (fileInput) fileInput.value = "";
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">Google Drive Uploader</h1>

//       {/* Email Input */}
//       <div className="w-full max-w-md mb-4">
//         <label className="block text-gray-700 mb-2">Your Google Email:</label>
//         <div className="flex">
//           <input
//             type="email"
//             value={email}
//             onChange={handleEmailChange}
//             placeholder="example@gmail.com"
//             className="flex-1 p-3 border border-gray-300 rounded-l focus:outline-none focus:ring focus:border-blue-300"
//           />
//           <button
//             onClick={() => checkAuthentication(email)}
//             disabled={!email || isLoading}
//             className={`px-4 py-3 ${
//               !email || isLoading
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-indigo-500 hover:bg-indigo-600"
//             } text-white rounded-r transition-colors duration-200`}
//           >
//             Verify
//           </button>
//         </div>
//       </div>

//       {/* Authentication Status */}
//       <div
//         className={`w-full max-w-md p-4 mb-4 rounded shadow ${
//           isAuthenticated
//             ? "bg-green-100 border border-green-300"
//             : "bg-yellow-100 border border-yellow-300"
//         }`}
//       >
//         <p className={isAuthenticated ? "text-green-800" : "text-yellow-800"}>
//           {isAuthenticated ? `Authenticated as: ${email}` : "Not authenticated"}
//         </p>
//         {isAuthenticated ? (
//           <button
//             onClick={handleLogout}
//             className="mt-3 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg hover:from-red-600 hover:to-red-700 transition duration-300"
//           >
//             Logout
//           </button>
//         ) : (
//           <button
//             onClick={startAuthentication}
//             disabled={isLoading || !email}
//             className={`mt-3 px-6 py-2 ${
//               isLoading || !email
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-blue-500 hover:bg-blue-600"
//             } text-white rounded shadow transition-colors duration-200`}
//           >
//             {isLoading ? "Loading..." : "Authenticate with Google"}
//           </button>
//         )}
//       </div>

//       {/* File Upload Section */}
//       <div className="w-full max-w-md mt-4">
//         <input
//           id="file-input"
//           type="file"
//           onChange={handleFileChange}
//           className="w-full p-3 border border-gray-300 rounded mb-3 focus:outline-none focus:ring focus:border-blue-300"
//           disabled={!isAuthenticated}
//         />
//         <button
//           onClick={uploadFile}
//           disabled={isLoading || !isAuthenticated || !selectedFile}
//           className={`w-full p-3 ${
//             isLoading || !isAuthenticated || !selectedFile
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-purple-500 hover:bg-purple-600"
//           } text-white rounded shadow transition-colors duration-200`}
//         >
//           {isLoading ? "Uploading..." : "Upload File"}
//         </button>
//       </div>

//       {/* Message Display */}
//       {message && (
//         <div className="w-full max-w-md mt-4 p-4 rounded bg-blue-50 border border-blue-200 text-blue-800">
//           {message}
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;












// import { useState, useEffect } from "react";
// import axios from "axios";

// function App() {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [message, setMessage] = useState("");
//   const [email, setEmail] = useState("");
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);

//   // On component mount, check local storage for a saved email and verify authentication.
//   useEffect(() => {
//     const storedEmail = localStorage.getItem("driveUploaderEmail");
//     if (storedEmail) {
//       setEmail(storedEmail);
//       checkAuthentication(storedEmail);
//     }
//   }, []);

//   // Check if the user is authenticated by calling the backend.
//   const checkAuthentication = async (emailToCheck) => {
//     if (!emailToCheck) return;
//     try {
//       const res = await axios.get(
//         `http://localhost:5000/check-auth/${encodeURIComponent(emailToCheck)}`
//       );
//       console.log("Authentication response:", res.data);
//       setIsAuthenticated(res.data.authenticated);
//       if (res.data.authenticated) {
//         setMessage(`Authenticated as ${emailToCheck}`);
//       } else {
//         setMessage("Not authenticated yet. Please complete the authentication popup.");
//       }
//     } catch (error) {
//       console.error("Error checking authentication:", error);
//       setIsAuthenticated(false);
//       setMessage("Error checking authentication status");
//     }
//   };

//   // Start the Google OAuth authentication process via a popup.
//   const startAuthentication = async () => {
//     if (!email) {
//       setMessage("Please enter your email address first");
//       return;
//     }

//     setIsLoading(true);
//     setMessage("Starting authentication process...");

//     try {
//       const res = await axios.get("http://localhost:5000/auth/url");
//       console.log("Google Auth URL received:", res.data.url);
//       if (!res.data.url) {
//         setMessage("Failed to retrieve authentication URL. Check server logs.");
//         setIsLoading(false);
//         return;
//       }

//       // Save the email to local storage for later use.
//       localStorage.setItem("driveUploaderEmail", email.trim());

//       // Open the authentication URL in a popup window.
//       const authWindow = window.open(
//         res.data.url,
//         "googleAuthWindow",
//         "width=600,height=700"
//       );

//       if (!authWindow || authWindow.closed || typeof authWindow.closed === "undefined") {
//         setMessage("Popup was blocked! Please allow popups for this site and try again.");
//         setIsLoading(false);
//         return;
//       }

//       // Polling the popup window: Once it's closed, verify authentication.
//       const timer = setInterval(() => {
//         if (authWindow.closed) {
//           clearInterval(timer);
//           setMessage("Popup closed. Verifying authentication...");
//           checkAuthentication(email);
//           setIsLoading(false);
//         }
//       }, 1000);
//     } catch (error) {
//       console.error("Error starting authentication:", error);
//       setMessage("Failed to start authentication process.");
//       setIsLoading(false);
//     }
//   };

//   // Handle email input changes.
//   const handleEmailChange = (e) => {
//     setEmail(e.target.value);
//   };

//   // Handle file input changes.
//   const handleFileChange = (e) => {
//     setSelectedFile(e.target.files[0]);
//     setMessage(e.target.files[0] ? `Selected file: ${e.target.files[0].name}` : "");
//   };

//   // Upload the file to the backend.
//   const uploadFile = async () => {
//     if (!selectedFile) {
//       setMessage("Please select a file first");
//       return;
//     }

//     if (!email || !isAuthenticated) {
//       setMessage("Please authenticate with Google first");
//       return;
//     }

//     setIsLoading(true);
//     setMessage("Uploading file...");

//     const formData = new FormData();
//     formData.append("file", selectedFile);
//     formData.append("email", email);

//     try {
//       const res = await axios.post("http://localhost:5000/upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setMessage(res.data.message || "File uploaded successfully!");
//       setSelectedFile(null);

//       // Reset the file input element.
//       const fileInput = document.getElementById("file-input");
//       if (fileInput) fileInput.value = "";
//     } catch (error) {
//       console.error("Upload failed:", error);
//       setMessage(`Upload failed: ${error.response?.data?.error || "Unknown error"}`);
//     }

//     setIsLoading(false);
//   };

//   // Logout: clears state and local storage.
//   const handleLogout = () => {
//     setEmail("");
//     setIsAuthenticated(false);
//     setSelectedFile(null);
//     localStorage.removeItem("driveUploaderEmail");
//     setMessage("Logged out successfully");

//     // Reset the file input element.
//     const fileInput = document.getElementById("file-input");
//     if (fileInput) fileInput.value = "";
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">Google Drive Uploader</h1>

//       {/* Email Input */}
//       <div className="w-full max-w-md mb-4">
//         <label className="block text-gray-700 mb-2">Your Google Email:</label>
//         <div className="flex">
//           <input
//             type="email"
//             value={email}
//             onChange={handleEmailChange}
//             placeholder="example@gmail.com"
//             className="flex-1 p-3 border border-gray-300 rounded-l focus:outline-none focus:ring focus:border-blue-300"
//           />
//           <button
//             onClick={() => checkAuthentication(email)}
//             disabled={!email || isLoading}
//             className={`px-4 py-3 ${
//               !email || isLoading
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-indigo-500 hover:bg-indigo-600"
//             } text-white rounded-r transition-colors duration-200`}
//           >
//             Verify
//           </button>
//         </div>
//       </div>

//       {/* Authentication Status */}
//       <div
//         className={`w-full max-w-md p-4 mb-4 rounded shadow ${
//           isAuthenticated
//             ? "bg-green-100 border border-green-300"
//             : "bg-yellow-100 border border-yellow-300"
//         }`}
//       >
//         <p className={isAuthenticated ? "text-green-800" : "text-yellow-800"}>
//           {isAuthenticated ? `Authenticated as: ${email}` : "Not authenticated"}
//         </p>
//         {isAuthenticated ? (
//           <button
//             onClick={handleLogout}
//             className="mt-3 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg hover:from-red-600 hover:to-red-700 transition duration-300"
//           >
//             Logout
//           </button>
//         ) : (
//           <button
//             onClick={startAuthentication}
//             disabled={isLoading || !email}
//             className={`mt-3 px-6 py-2 ${
//               isLoading || !email
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-blue-500 hover:bg-blue-600"
//             } text-white rounded shadow transition-colors duration-200`}
//           >
//             {isLoading ? "Loading..." : "Authenticate with Google"}
//           </button>
//         )}
//       </div>

//       {/* File Upload Section */}
//       <div className="w-full max-w-md mt-4">
//         <input
//           id="file-input"
//           type="file"
//           onChange={handleFileChange}
//           className="w-full p-3 border border-gray-300 rounded mb-3 focus:outline-none focus:ring focus:border-blue-300"
//           disabled={!isAuthenticated}
//         />
//         <button
//           onClick={uploadFile}
//           disabled={isLoading || !isAuthenticated || !selectedFile}
//           className={`w-full p-3 ${
//             isLoading || !isAuthenticated || !selectedFile
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-purple-500 hover:bg-purple-600"
//           } text-white rounded shadow transition-colors duration-200`}
//         >
//           {isLoading ? "Uploading..." : "Upload File"}
//         </button>
//       </div>

//       {/* Message Display */}
//       {message && (
//         <div className="w-full max-w-md mt-4 p-4 rounded bg-blue-50 border border-blue-200 text-blue-800">
//           {message}
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;





































// import { useState, useEffect } from "react";
// import axios from "axios";

// function App() {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [message, setMessage] = useState("");
//   const [email, setEmail] = useState("");
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);

//   // On component mount, check local storage for a saved email
//   useEffect(() => {
//     const storedEmail = localStorage.getItem("driveUploaderEmail");
//     if (storedEmail) {
//       setEmail(storedEmail);
//       checkAuthentication(storedEmail);
//     }
//   }, []);

//   // Check if the user is authenticated by calling the backend
//   const checkAuthentication = async (emailToCheck) => {
//     if (!emailToCheck) return;
//     try {
//       const res = await axios.get(
//         `http://localhost:5000/check-auth/${encodeURIComponent(emailToCheck)}`
//       );
//       console.log("Authentication response:", res.data);
//       setIsAuthenticated(res.data.authenticated);
//       if (res.data.authenticated) {
//         setMessage(`Authenticated as ${emailToCheck}`);
//       }
//     } catch (error) {
//       console.error("Error checking authentication:", error);
//       setIsAuthenticated(false);
//       setMessage("Error checking authentication status");
//     }
//   };

//   // Start the Google OAuth authentication process
//   const startAuthentication = async () => {
//     if (!email) {
//       setMessage("Please enter your email address first");
//       return;
//     }

//     setIsLoading(true);
//     setMessage("Starting authentication process...");

//     try {
//       const res = await axios.get("http://localhost:5000/auth/url");
//       console.log("Google Auth URL received:", res.data.url);
//       if (!res.data.url) {
//         setMessage("Failed to retrieve authentication URL. Check server logs.");
//         setIsLoading(false);
//         return;
//       }

//       // Save the email to local storage for later use
//       localStorage.setItem("driveUploaderEmail", email.trim());

//       // Redirect to the Google OAuth URL (avoids popup blockers)
//       window.location.href = res.data.url;
//     } catch (error) {
//       console.error("Error starting authentication:", error);
//       setMessage("Failed to start authentication process.");
//     }

//     setIsLoading(false);
//   };

//   // Handle email input changes
//   const handleEmailChange = (e) => {
//     setEmail(e.target.value);
//   };

//   // Handle file input changes
//   const handleFileChange = (e) => {
//     setSelectedFile(e.target.files[0]);
//     setMessage(e.target.files[0] ? `Selected file: ${e.target.files[0].name}` : "");
//   };

//   // Upload the file to the backend
//   const uploadFile = async () => {
//     if (!selectedFile) {
//       setMessage("Please select a file first");
//       return;
//     }

//     if (!email || !isAuthenticated) {
//       setMessage("Please authenticate with Google first");
//       return;
//     }

//     setIsLoading(true);
//     setMessage("Uploading file...");

//     const formData = new FormData();
//     formData.append("file", selectedFile);
//     formData.append("email", email);

//     try {
//       const res = await axios.post("http://localhost:5000/upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setMessage(res.data.message || "File uploaded successfully!");
//       setSelectedFile(null);

//       // Reset the file input element
//       const fileInput = document.getElementById("file-input");
//       if (fileInput) fileInput.value = "";
//     } catch (error) {
//       console.error("Upload failed:", error);
//       setMessage(`Upload failed: ${error.response?.data?.error || "Unknown error"}`);
//     }

//     setIsLoading(false);
//   };

//   // Logout function clears state and local storage
//   const handleLogout = () => {
//     setEmail("");
//     setIsAuthenticated(false);
//     setSelectedFile(null);
//     localStorage.removeItem("driveUploaderEmail");
//     setMessage("Logged out successfully");

//     const fileInput = document.getElementById("file-input");
//     if (fileInput) fileInput.value = "";
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
//       <h1 className="text-2xl font-bold text-gray-700 mb-6">Google Drive Uploader</h1>

//       {/* Email Input */}
//       <div className="w-full max-w-md mb-4">
//         <label className="block text-gray-700 mb-2">Your Google Email:</label>
//         <div className="flex">
//           <input
//             type="email"
//             value={email}
//             onChange={handleEmailChange}
//             placeholder="example@gmail.com"
//             className="flex-1 p-2 border border-gray-300 rounded-l"
//           />
//           <button
//             onClick={() => checkAuthentication(email)}
//             disabled={!email || isLoading}
//             className={`px-4 ${
//               !email || isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-gray-500 hover:bg-gray-600"
//             } text-white rounded-r`}
//           >
//             Verify
//           </button>
//         </div>
//       </div>

//       {/* Authentication Status */}
//       <div
//         className={`w-full max-w-md p-3 mb-4 rounded ${
//           isAuthenticated ? "bg-green-100 border border-green-300" : "bg-yellow-100 border border-yellow-300"
//         }`}
//       >
//         <p className={isAuthenticated ? "text-green-800" : "text-yellow-800"}>
//           {isAuthenticated ? `Authenticated as: ${email}` : "Not authenticated"}
//         </p>
//         {isAuthenticated ? (
//           <button
//             onClick={handleLogout}
//             className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
//           >
//             Logout
//           </button>
//         ) : (
//           <button
//             onClick={startAuthentication}
//             disabled={isLoading || !email}
//             className={`mt-2 px-4 py-2 ${
//               isLoading || !email ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
//             } text-white rounded`}
//           >
//             {isLoading ? "Loading..." : "Authenticate with Google"}
//           </button>
//         )}
//       </div>

//       {/* File Upload Section */}
//       <div className="w-full max-w-md mt-4">
//         <input
//           id="file-input"
//           type="file"
//           onChange={handleFileChange}
//           className="w-full p-2 border border-gray-300 rounded mb-3"
//           disabled={!isAuthenticated}
//         />
//         <button
//           onClick={uploadFile}
//           disabled={isLoading || !isAuthenticated || !selectedFile}
//           className={`w-full p-3 ${
//             isLoading || !isAuthenticated || !selectedFile
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-purple-500 hover:bg-purple-600"
//           } text-white rounded shadow`}
//         >
//           {isLoading ? "Uploading..." : "Upload File"}
//         </button>
//       </div>

//       {/* Message Display */}
//       {message && (
//         <div className="w-full max-w-md mt-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800">
//           {message}
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;








// import { useState } from "react";
// import axios from "axios";

// function App() {
//   const [authUrl, setAuthUrl] = useState("");
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [message, setMessage] = useState("");

//   // Get Google Auth URL
//   const getAuthUrl = async () => {
//     try {
//       const res = await axios.get("http://localhost:5000/auth/url");
//       setAuthUrl(res.data.url);
//     } catch (error) {
//       console.error("Error fetching auth URL", error);
//     }
//   };

//   // Handle File Selection
//   const handleFileChange = (event) => {
//     setSelectedFile(event.target.files[0]);
//   };

//   // Upload File
//   const uploadFile = async () => {
//     if (!selectedFile) {
//       setMessage("Please select a file first.");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       const res = await axios.post("http://localhost:5000/upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       console.log("huiiiiii",res);
//       setMessage("File uploaded successfully!");
//     } catch (error) {
//       console.error("Upload failed", error);
//       setMessage("File upload failed.");
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
//       <h1 className="text-2xl font-bold text-gray-700 mb-4">Google Drive Uploader</h1>

//       {/* Authenticate */}
//       {!authUrl ? (
//         <button onClick={getAuthUrl} className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">
//           Authenticate with Google
//         </button>
//       ) : (
//         <a href={authUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600">
//           Complete Authentication
//         </a>
//       )}

//       {/* File Upload */}
//       <div className="mt-6">
//         <input type="file" onChange={handleFileChange} className="mb-4" />
//         <button onClick={uploadFile} className="px-6 py-3 bg-purple-500 text-blue rounded-lg shadow-md hover:bg-purple-600">
//           Upload File
//         </button>
//       </div>

//       {message && <p className="mt-4 text-gray-600">{message}</p>}
//     </div>
//   );
// }

// export default App;




// import { useState } from "react";
// import axios from "axios";

// function App() {
//   const [authUrl, setAuthUrl] = useState("");
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [message, setMessage] = useState("");
//   const [authenticated, setAuthenticated] = useState(false);

//   // Get Google OAuth URL
//   const getAuthUrl = async () => {
//     try {
//       const res = await axios.get("http://localhost:5000/auth/url", { withCredentials: true });
//       setAuthUrl(res.data.url);
//     } catch (error) {
//       console.error("Error fetching auth URL", error);
//     }
//   };

//   // Handle File Selection
//   const handleFileChange = (event) => {
//     setSelectedFile(event.target.files[0]);
//   };

//   // Upload File
//   const uploadFile = async () => {
//     if (!selectedFile) {
//       setMessage("Please select a file first.");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       const res = await axios.post("http://localhost:5000/upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         withCredentials: true,
//       });
//       setMessage("File uploaded successfully!");
//     } catch (error) {
//       console.error("Upload failed", error);
//       setMessage("File upload failed.");
//     }
//   };

//   // Logout User
//   const logout = async () => {
//     try {
//       await axios.get("http://localhost:5000/logout", { withCredentials: true });
//       setAuthenticated(false);
//       setAuthUrl("");
//       setMessage("Logged out successfully.");
//     } catch (error) {
//       console.error("Logout failed", error);
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
//       <h1 className="text-2xl font-bold text-gray-700 mb-4">Google Drive Uploader</h1>

//       {/* Authenticate */}
//       {!authenticated ? (
//         <>
//           {!authUrl ? (
//             <button
//               onClick={getAuthUrl}
//               className="px-6 py-3 bg-blue-500 text-black rounded-lg shadow-md hover:bg-blue-600"
//             >
//               Authenticate with Google
//             </button>
//           ) : (
//             <a
//               href={authUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="px-6 py-3 bg-green-500 text-black rounded-lg shadow-md hover:bg-green-600"
//             >
//               Complete Authentication
//             </a>
//           )}
//         </>
//       ) : (
//         <button
//           onClick={logout}
//           className="px-6 py-3 bg-red-500 text-black rounded-lg shadow-md hover:bg-red-600"
//         >
//           Logout
//         </button>
//       )}

//       {/* File Upload */}
//       <div className="mt-6">
//         <input type="file" onChange={handleFileChange} className="mb-4" />
//         <button
//           onClick={uploadFile}
//           className="px-6 py-3 bg-purple-500 text-black rounded-lg shadow-md hover:bg-purple-600"
//         >
//           Upload File
//         </button>
//       </div>

//       {message && <p className="mt-4 text-gray-600">{message}</p>}
//     </div>
//   );
// }

// export default App;
