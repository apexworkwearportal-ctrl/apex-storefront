export const COUNTRIES = [
  { code: "CA", name: "Canada" },
  { code: "US", name: "United States" },
];

export const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon Territory" },
];

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AS", name: "American Samoa" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "AE", name: "Armed Forces Africa" },
  { code: "AA", name: "Armed Forces Americas" },
  { code: "AE", name: "Armed Forces Canada" },
  { code: "AE", name: "Armed Forces Europe" },
  { code: "AE", name: "Armed Forces Middle East" },
  { code: "AP", name: "Armed Forces Pacific" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FM", name: "Federated States Of Micronesia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "GU", name: "Guam" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Pennsylvania" },
  { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VI", name: "Virgin Islands" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export function normalizeCountryCode(countryStr) {
  if (!countryStr) return "CA";
  const c = String(countryStr).trim().toUpperCase();
  if (c === "US" || c === "USA" || c === "UNITED STATES") return "US";
  return "CA";
}

export function normalizeStateCode(stateStr, countryStr) {
  if (!stateStr) return "ON";
  const s = String(stateStr).trim().toUpperCase();
  const c = normalizeCountryCode(countryStr);

  const list = c === "US" ? US_STATES : CANADIAN_PROVINCES;

  // 1. Exact match with code (e.g. "ON", "BC", "NY")
  const codeMatch = list.find((item) => item.code.toUpperCase() === s);
  if (codeMatch) return codeMatch.code;

  // 2. Exact or partial match with name (e.g. "Ontario", "California")
  const nameMatch = list.find(
    (item) => item.name.toUpperCase() === s || s.includes(item.name.toUpperCase())
  );
  if (nameMatch) return nameMatch.code;

  // 3. Check across both lists if country wasn't clear
  const altList = c === "US" ? CANADIAN_PROVINCES : US_STATES;
  const altMatch = altList.find(
    (item) => item.code.toUpperCase() === s || item.name.toUpperCase() === s
  );
  if (altMatch) return altMatch.code;

  // Fallback to original string if 2 uppercase chars, or default "ON"
  return s.length === 2 ? s : "ON";
}

export function formatPostalCode(zipStr, countryStr) {
  if (!zipStr) return countryStr === "US" ? "90210" : "L4W 4K1";
  const z = String(zipStr).trim().toUpperCase();
  const c = normalizeCountryCode(countryStr);
  if (c === "CA" && z.length === 6 && !z.includes(" ")) {
    return `${z.substring(0, 3)} ${z.substring(3)}`;
  }
  return z;
}

export const DEFAULT_SINALITE_BILLING = {
  BillFName: "Apex",
  BillLName: "Workwear",
  BillEmail: "apexwordwearportal@gmail.com",
  BillAddr: "1515 Britannia Rd E Unit 14-15",
  BillAddr2: "",
  BillCity: "Mississauga",
  BillState: "ON",
  BillZip: "L4W 4K1",
  BillCountry: "CA",
  BillPhone: "6475701249"
};

export function getSinaliteBillingInfo(customBilling) {
  if (!customBilling || typeof customBilling !== "object") {
    return { ...DEFAULT_SINALITE_BILLING };
  }

  const bCountry = normalizeCountryCode(customBilling.BillCountry || customBilling.country || "CA");
  const bState = normalizeStateCode(customBilling.BillState || customBilling.state || "ON", bCountry);
  const bZip = formatPostalCode(customBilling.BillZip || customBilling.zip || "L4W 4K1", bCountry);

  return {
    BillFName: customBilling.BillFName || customBilling.billFName || DEFAULT_SINALITE_BILLING.BillFName,
    BillLName: customBilling.BillLName || customBilling.billLName || DEFAULT_SINALITE_BILLING.BillLName,
    BillEmail: customBilling.BillEmail || customBilling.billEmail || DEFAULT_SINALITE_BILLING.BillEmail,
    BillAddr: customBilling.BillAddr || customBilling.billAddr || DEFAULT_SINALITE_BILLING.BillAddr,
    BillAddr2: customBilling.BillAddr2 || customBilling.billAddr2 || "",
    BillCity: customBilling.BillCity || customBilling.billCity || DEFAULT_SINALITE_BILLING.BillCity,
    BillState: bState,
    BillZip: bZip,
    BillCountry: bCountry,
    BillPhone: customBilling.BillPhone || customBilling.billPhone || DEFAULT_SINALITE_BILLING.BillPhone
  };
}
