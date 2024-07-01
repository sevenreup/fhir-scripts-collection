This script is for creating a csv from Fhir search queries.

## Input File
A file containing an array of DataPoints to get the count for
```json
[
  {
    "column_name": "With name",
    "filter": "given=valueGiven&family=valueFamily",
    "base_resource": "Patient"
  }
]
```

## Output file
A csv file containing the required data
```csv
Column Name,Total
With name,30
```