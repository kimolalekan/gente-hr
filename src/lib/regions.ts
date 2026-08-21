import { countries } from "./countries";

export interface CountryState {
  name: string;
  stateCode: string;
}

export interface CountryRegion {
  name: string;
  iso2: string;
  iso3: string;
  states: CountryState[];
}

interface RawState {
  name: string;
  state_code?: string | null;
}

interface RawCountry {
  name: string;
  iso2: string;
  iso3: string;
  states?: RawState[];
}

/** All countries with their states (from countries.ts), normalized. */
export const REGIONS: CountryRegion[] = (countries as RawCountry[]).map(
  (country) => ({
    name: country.name,
    iso2: country.iso2,
    iso3: country.iso3,
    states: (country.states ?? [])
      .filter((state) => typeof state?.name === "string")
      .map((state) => ({
        name: state.name,
        stateCode: state.state_code ?? "",
      })),
  }),
);

/** Country names, sorted — for selects. */
export const COUNTRY_NAMES: string[] = countries
  .map((country) => country.name)
  .sort();

/** States for a country (by name), sorted; empty when none are listed. */
export function getStatesFor(countryName: string): CountryState[] {
  const country = REGIONS.find((item) => item.name === countryName);
  if (!country) return [];
  return [...country.states].sort((a, b) => a.name.localeCompare(b.name));
}
