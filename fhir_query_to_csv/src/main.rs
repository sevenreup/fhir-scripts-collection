use clap::Parser;
use dotenv::dotenv;
use serde::Deserialize;
use std::env;
use std::fs;
use std::fs::File;
use std::io::Write;
use url::Url;

#[derive(Debug, Deserialize)]
struct DataPoint {
    column_name: String,
    filter: String,
    base_resource: String,
}

#[derive(Debug, Deserialize)]
struct SearchResult {
    total: u32,
}

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    #[arg(short, long)]
    path: String,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let token = env::var("AUTH_TOKEN").expect("AUTH_TOKEN not set in .env");
    let base_url = env::var("BASE_URL").expect("BASE_URL not set in .env");

    let args = Args::parse();

    let json_file_path = args.path;

    let json_content = fs::read_to_string(json_file_path).unwrap();

    let data_points: Vec<DataPoint> = serde_json::from_str(&json_content).unwrap();

    let client = reqwest::Client::new();

    let file = File::create("output.csv");
    match file {
        Ok(mut csv_output) => {
            writeln!(csv_output, "Column Name,Total").unwrap();

            for data_point in &data_points {
                let mut url =
                    Url::parse(format!("{}/{}", base_url, data_point.base_resource).as_str())
                        .unwrap();
                url.query_pairs_mut().append_pair("_summary", "count");

                let mut query_pairs: Vec<(String, String)> =
                    url.query_pairs().into_owned().collect();

                // Split and process the existing filter
                for (key, value) in data_point.filter.split('&').filter_map(|pair| {
                    let mut split = pair.splitn(2, '=');
                    Some((split.next()?.to_string(), split.next()?.to_string()))
                }) {
                    query_pairs.push((key, value));
                }

                // Append new query parameters here if needed
                // query_pairs.push(("new_key".to_string(), "new_value".to_string()));

                // Rebuild the URL with the modified query parameters
                url.query_pairs_mut().clear().extend_pairs(query_pairs);

                let response = make_authenticated_request(&client, &url.to_string(), &token).await;
                match response {
                    Ok(search_result) => {
                        writeln!(
                            csv_output,
                            "{},{}",
                            data_point.column_name, search_result.total
                        )
                        .unwrap();
                    }
                    Err(e) => println!("Error: {}", e),
                }
            }

            println!("CSV data generated successfully!");
        }
        Err(e) => println!("Error: {}", e),
    }
}

async fn make_authenticated_request(
    client: &reqwest::Client,
    url: &str,
    token: &str,
) -> Result<SearchResult, reqwest::Error> {
    println!("Making request to: {}", url);
    let response = client
        .get(url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await?
        .text()
        .await?;
    print!("{}", response);
    let search_result: SearchResult = serde_json::from_str(&response).unwrap();

    Ok(search_result)
}
