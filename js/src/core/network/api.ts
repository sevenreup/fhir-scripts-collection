import axios from "axios";

export const fhirClient = () =>
  axios.create({
    baseURL: process.env.FHIR_API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FHIR_API_ACCESS_TOKEN}`,
    },
  });

// Function to send a FHIR Bundle entry to the server with a delay
export async function sendFHIRRequestWithDelay<T>(
  basePath: string,
  entry: T,
  delay: number,
  headers: Record<string, string> = {}
) {
  return new Promise<boolean>((resolve) => {
    setTimeout(async () => {
      try {
        const response = await fhirClient().post(basePath, entry, {
          headers: headers,
        });

        console.info("Response:", JSON.stringify(response.data, null, 2));
        resolve(true);
      } catch (error: any) {
        console.error("Error:", error.message);
        resolve(false); // Continue to the next request even if an error occurs
      }
    }, delay);
  });
}
