const fs = require("fs");
const path = require("path");

// Function to recursively find JSON files in a folder and its subfolders
function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findJsonFiles(filePath, fileList); // Recurse into subfolder
    } else if (filePath.endsWith(".json")) {
      fileList.push(filePath); // Add JSON file to the list
    }
  }

  return fileList;
}

// Function to read and parse JSON files
function parseJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error parsing JSON file: ${filePath}`);
    return null;
  }
}

// Function to filter FHIR Questionnaire resources
function isQuestionnaireResource(resource) {
  return resource.resourceType === "Questionnaire";
}

// Main function to create a FHIR Bundle from Questionnaire resources
function createQuestionnaireBundle() {
  const jsonFiles = findJsonFiles(
    "D:\\Work\\dev\\fhir-resources\\questionnaire"
  );
  const questionnaireResources = [];

  for (const filePath of jsonFiles) {
    const resource = parseJsonFile(filePath);

    if (resource && isQuestionnaireResource(resource)) {
      questionnaireResources.push(resource);
    }
  }

  // Create a FHIR Bundle with Questionnaire resources
  const bundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: questionnaireResources.map((resource) => ({
      fullUrl: `Questionnaire/${resource.id}`,
      resource,
      request: {
        method: "PUT",
        url: `Questionnaire/${resource.id}`,
      },
    })),
  };

  console.log({
    legth: questionnaireResources.length,
  });
  // console.log(JSON.stringify(bundle, null, 2));
  fs.writeFileSync("out.json", JSON.stringify(bundle, null, 2));
}

// Call the main function to create the bundle
createQuestionnaireBundle();
