import { writeFile } from "fs";
import * as helpers from "./helpers.js";
import { ipmaCity, City } from "./helpers.js";

// Urls to fetch data
const districtUrl =
  "https://www.gee.gov.pt/pt/docs/doc-o-gee-2/estatisticas-regionais/distritos-concelhos";
const countyUrl =
  "https://www.gee.gov.pt/pt/docs/doc-o-gee-2/estatisticas-regionais/distritos-concelhos";

let json: City[] = [];

// START

// Fetch district data from website
console.log("Fetching districts...")
const districts: string[] = await helpers.loadDataFromHTML(districtUrl);
console.log("Done fetching districts!")

// Iterate over districts array in order to get every county per 
// district. 
console.log("Fetching counties...")
const allPromises = await Promise.all(
  districts.map(async (d) => {
    // Fetch counties data from website
    console.log(`Fetching counties from ${d}...`)
    const counties: string[] = (
      await helpers.loadDataFromHTML(countyUrl + "/" + d)
    ).flat();

    return Promise.all(
      // The major cities already have their necessary data 
      // colected - defaults to the dataset
      counties.map(async (c) => {
        const ipmaCity: ipmaCity = helpers.existsInIpma(c);
        if (ipmaCity) {
          saveCity({
            id: ipmaCity.ipmaID,
            latitude: ipmaCity.latitude,
            longitude: ipmaCity.longitude,
            local: ipmaCity.local,
            district: d,
          });
        } else {
          // When not in the dataset - missing data (coords) is 
          // fetched via Google's geolocation API
          try {
            const {
              latitude,
              longitude,
            }: { latitude: string; longitude: string } =
              await helpers.findOnMap(c);

            saveCity({ id: 0, latitude, longitude, local: c, district: d });
          } catch (error) {
            console.error(`Geocode error for ${c}:`, error);
          }
        }
      })
    );
  })
);
console.log("Done fetching counties!")

// Wait for all nested asynchronous operations to complete.
await Promise.all(allPromises.flat());

console.log("Saving list...")
// Write cities' json in a .json file
writeFile("output.json", JSON.stringify(json, null, 2), (err) => {
  if (err) {
    console.log("Error saving list:", err);
  } else {
    console.log("Successfully saved list");
  }
});

// END

// Support func
// Store city in json
function saveCity(city: City) {
  json.push(city);
}
