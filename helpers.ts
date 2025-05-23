import { readFileSync } from "fs";
import * as cheerio from "cheerio";
import { Client } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";

dotenv.config();

// Interfaces
export interface ipmaCity {
  ipmaID: number;
  latitude: string;
  longitude: string;
  local: string;
}

export interface City {
  id: number;
  latitude: string;
  longitude: string;
  local: string;
  district: string;
}

// Types
type coords = { latitude: string; longitude: string };

// Initialize Google client
const client = new Client({});

// Finds county in known cities
export const existsInIpma = (county: string): ipmaCity => {
  const ipmaDataRaw = readFileSync("./dataset.json", "utf8");
  const ipmaData = JSON.parse(ipmaDataRaw);

  return ipmaData.find((e: ipmaCity) => e.local === county);
};

// Fetches data from HTML page
export async function loadDataFromHTML(url: string) {
  const page: Response = await fetch(url);
  const html: string = await page.text();

  const $: cheerio.CheerioAPI = cheerio.load(html);
  return findInHTML($);
}

// Finds county location using Google's geolocation API
export async function findOnMap(county: string): Promise<coords> {
  // Arguments for geolocation API
  const args = {
    params: {
      key: process.env.API_KEY,
      address: county + ", Portugal", // Add Portugal to address to ensure city is found
    },
  };

  // Geolocation API request
  const gcResponse = await client.geocode(args);

  // Extract data from response
  const latitude: string = String(
    gcResponse.data.results[0].geometry.location.lat
  );
  const longitude: string = String(
    gcResponse.data.results[0].geometry.location.lng
  );

  return { latitude, longitude };
}

// Extracts and returns a list of district or county names from the HTML structure. 
//
// The names are extracted from the <a> elements, cleaned of whitespace, and
// filtered to remove any empty strings. It uses 'Pasta' as a delimiter, as
// the raw text appears to be concatenated in that format.
function findInHTML($: cheerio.CheerioAPI): string[] {
  return $(".koowa_table--categories")
    .find("tbody")
    .children("tr")
    .find("a")
    .text()
    .split("Pasta")
    .map((str) => str.trim())
    .filter(function (str: string) {
      return /\S/.test(str);
    });
}
