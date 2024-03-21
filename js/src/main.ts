import { program } from "commander";
import { getAllPatientsFromBundleCommand } from "./scripts/get_all_patients";
import { fixResourceMetaTagCommand } from "./scripts/fix-resource-meta";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });

program.addCommand(getAllPatientsFromBundleCommand);
program.addCommand(fixResourceMetaTagCommand);

program.parse(process.argv);
