const fs = require("fs");
const axios = require("axios");

const accessToken = ``;

// Function to send a FHIR Bundle entry to the server with a delay
async function sendFHIRRequestWithDelay(basePath, entry, delay) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        // Replace 'YOUR_SERVER_URL' with the actual FHIR server URL
        const response = await axios.put(
          `URL_HERE/fhir/${basePath}`,
          entry,
          {
            headers: {
              "Content-Type": "application/fhir+json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log("Response:", response.data);
        resolve();
      } catch (error) {
        console.log(entry);
        console.error("Error:", error.message);
        resolve(); // Continue to the next request even if an error occurs
      }
    }, delay);
  });
}

// Read the JSON file containing the FHIR transaction Bundle resource
fs.readFile("output/update.json", "utf8", async (err, data) => {
  if (err) {
    console.error("Error reading JSON file:", err);
    return;
  }

  try {
    const bundle = JSON.parse(data);

    if (bundle.resourceType === "Bundle" && bundle.type === "transaction") {
      // Delay between each request in milliseconds (e.g., 5000 ms = 5 seconds)
      const delayBetweenRequests = 2000;

      // Loop through the entries in the Bundle
      for (const entry of bundle.entry.reverse()) {
        if (entry.resource) {
          // Send the FHIR request with a delay
          await sendFHIRRequestWithDelay(
            entry.fullUrl,
            entry.resource,
            delayBetweenRequests
          );
        }
      }
    } else {
      console.error("Invalid FHIR Bundle type or resourceType.");
    }
  } catch (error) {
    console.error("Error parsing JSON data:", error.message);
  }
});
