import fs from "fs";

const createBundle = (ids: string[]) => {
  const entries = ids.map((id) => ({
    request: {
      method: "GET",
      url:
        "/Patient/" +
        id +
        "?_tag=http%3A%2F%2Fsmartregister.org%2Ffhir%2Forganization-tag%7C209",
    },
  }));
  return {
    resourceType: "Bundle",
    type: "batch",
    entry: entries,
  };
};

export default function script() {
  fs.readFile("in/data.json", "utf8", (err, data) => {
    const bundle = JSON.parse(data);
    const allLinks = new Set<string>();

    for (const entry of bundle.entry) {
      const patientRef = entry.resource.subject.reference.split("/").pop();

      allLinks.add(patientRef);
    }
    const newBundle = createBundle(Array.from(allLinks));
    console.log(JSON.stringify(newBundle));
  });
}
