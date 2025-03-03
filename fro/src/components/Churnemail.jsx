// import { useState } from "react";
// // import { Card, CardContent } from "@/components/ui/card";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";

// export default function Churnemail() {
//   const [email, setEmail] = useState("");
//   const [churnRisk, setChurnRisk] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const fetchChurnRisk = async () => {
//     setLoading(true);
//     setError("");

//     try {
//       const response = await fetch(
//         "http://localhost:4000/api/v1/metrics/email-churn-prediction",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ email }),
//         }
//       );

//       if (!response.ok) {
//         throw new Error("Failed to fetch churn risk.");
//       }

//       const data = await response.json();
//       setChurnRisk(data.churnRiskScore);
//     } catch (err) {
//       setError(err.message);
//     }

//     setLoading(false);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//         <h1>Hiiiii</h1>
//       {/* <Card className="w-96 shadow-lg p-4">
//         <CardContent className="flex flex-col space-y-4">
//           <h2 className="text-xl font-semibold text-center">Email Churn Prediction</h2>
//           <Input
//             type="email"
//             placeholder="Enter email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//           />
//           <Button onClick={fetchChurnRisk} disabled={loading}>
//             {loading ? "Checking..." : "Check Churn Risk"}
//           </Button>

//           {error && <p className="text-red-500 text-center">{error}</p>}

//           {churnRisk !== null && (
//             <div className="text-center p-2 bg-gray-200 rounded-md">
//               <p className="font-semibold">Churn Risk Score:</p>
//               <p className="text-lg font-bold text-red-600">{churnRisk}</p>
//             </div>
//           )}
//         </CardContent>
//       </Card> */}
//     </div>
//   );
// }
import { useState } from "react";

export default function Churnemail() {
  const [email, setEmail] = useState("");
  const [churnRisk, setChurnRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchChurnRisk = async () => {
    if (!email) {
      setError("Please enter an email.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:4000/api/v1/metrics/email-churn-prediction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: email,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch churn risk.");
      }

      const data = await response.json();
      setChurnRisk(data.churnRiskScore);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96 text-center">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Email Churn Prediction
        </h2>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchChurnRisk}
          className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Checking..." : "Check Churn Risk"}
        </button>

        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

        {churnRisk !== null && (
          <div className="mt-4 p-4 bg-blue-100 text-blue-800 rounded-lg">
            <p className="text-sm font-medium">Churn Risk Score:</p>
            <p className="text-xl font-bold">{churnRisk}</p>
          </div>
        )}
      </div>
    </div>
  );
}

