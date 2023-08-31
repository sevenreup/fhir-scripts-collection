// read a file called data.json and parse the json into a javascript object
// then write the object to a file called data.csv

// require the file system module
const fs = require("fs");

// read the file data.json and parse the json into a javascript object
fs.readFile("data.json", "utf8", (err, data) => {
  if (err) {
    console.log(err);
  } else {
    // parse the json into a javascript object
    const obj = JSON.parse(data);

    var patients = obj.entry.map((element) => {
      const patient = element.resource;
      const gender = patient.gender;
      let identifier = "N/A";
      if (patient.identifier !== undefined && patient.identifier !== null) {
        identifier = patient.identifier[0].value;
      }
      const address = patient.address[0];

      const name = patient.name[0].given[0] + " " + patient.name[0].family;
      return {
        name,
        gender,
        identifier,
        addressText: address.text ?? "Missing",
        district: address.district ?? "Missing",
        state: address.state ?? "Missing",
        dob: patient.birthDate ?? "Missing",
        lastUpdated: patient.meta.lastUpdated ?? "Missing",
      };
    });

    console.log({ count: patients.length, patients });

    const csv = patients.reduce((acc, patient) => {
      return `${acc}\n${patient.identifier},${patient.name},${patient.gender},"${patient.addressText}",${patient.district},${patient.state},${patient.dob},${patient.lastUpdated}`;
    }, "Id,Name,Gender,Address Text,Address District,Address State,DOB,lastUpdated");

    fs.writeFile("data.csv", csv, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("successfully wrote to file");
      }
    });
  }
});
