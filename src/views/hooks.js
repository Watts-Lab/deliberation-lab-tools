/* eslint-disable default-case */

// Taken from deliberation-empirica/client/src/components/hooks.js, emulating useText() and usePermalink()
import {
  usePlayer,
  useGame,
  usePlayers,
} from "@empirica/core/player/classic/react";
import { useGlobal } from "@empirica/core/player/react";
import axios from "axios";
import { useState, useEffect } from "react";

const cdnList = {
  // test: "deliberation-assets",
  test: "http://localhost:9091",
  local: "http://localhost:9090",
  prod: "https://s3.amazonaws.com/assets.deliberation-lab.org",
};

export function useFileURL({ file }) {
  const [filepath, setFilepath] = useState(undefined);
  const globals = useGlobal();
  const batchConfig = globals?.get("recruitingBatchConfig");
  // have to wait for globals to load, which is why we use the useEffects

  useEffect(() => {
    async function loadData() {
      const cdn = batchConfig?.cdn;
      const cdnURL = cdnList[cdn] || cdn || cdnList.prod;
      const fileURL = encodeURI(`${cdnURL}/${file}`);
      console.log(`Resolved filepath: ${fileURL}`);
      setFilepath(fileURL);
    }
    if (file && batchConfig) loadData();
  }, [file, batchConfig]);

  return filepath;
}

// should be passed the text in the active window document already, where file is the text
// error is null because there should not be an error
// this could probably be coded better to actually prevent these errors
export function useText({ file }) {
  return { text: file, error: null };
}

export function useConnectionInfo() {
  const [country, setCountry] = useState(undefined);
  const [timezone, setTimezone] = useState(undefined);
  const [timezoneOffset, setTimezoneOffset] = useState(undefined);
  const [isKnownVpn, setIsKnownVpn] = useState(undefined);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 3000; // 3 seconds

    async function loadData() {
      try {
        const ipwhois = await axios.get("https://ipwho.is");
        if (ipwhois.status !== 200) {
          throw new Error(
            `Failed to get IP location, status ${ipwhois.status}: ${ipwhois.statusText}`
          );
        }
        setCountry(ipwhois.data.country_code);
        setTimezone(ipwhois.data.timezone.id);
        setTimezoneOffset(ipwhois.data.timezone.utc);

        const vpnListResponse = await axios.get(
          "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt"
        );
        if (vpnListResponse.status !== 200) {
          throw new Error(
            `Failed to get VPN list, status ${vpnListResponse.status}: ${vpnListResponse.statusText}`
          );
        }
        const rawVpnList = vpnListResponse.data.split("\n");
        const vpnList = rawVpnList.map((line) => line.split("/")[0]);
        console.log(`Loaded ${vpnList.length} VPN/Datacenter ip addresses`);
        setIsKnownVpn(vpnList.includes(ipwhois.data.ip));
      } catch (error) {
        console.error(error.message);
        if (retryCount < maxRetries) {
          retryCount += 1;
          console.log(`Retrying... (${retryCount}/${maxRetries})`);
          setTimeout(loadData, retryDelay);
        }
      }
    }

    loadData();
  }, []);

  return { country, timezone, isKnownVpn, timezoneOffset };
}

export function usePermalink(file) {
    // how necessary is it to have permalink? Commented out because permalink is just for recordkeeping
//   const globals = useGlobal();
//   const resourceLookup = globals?.get("resourceLookup"); // get the permalink for this implementation of the file
//   const permalink = resourceLookup ? resourceLookup[file] : undefined;
//   return permalink;
  return "permalink";
}

const trimSlashes = (str) =>
  str
    .split("/")
    .filter((v) => v !== "")
    .join("/");

function isNumberOrParsableNumber(value) {
  return (
    typeof value === "number" ||
    (typeof value === "string" &&
      value.trim() !== "" &&
      !Number.isNaN(Number(value)))
  );
}

export function compare(lhs, comparator, rhs) {
  switch (comparator) {
    case "exists":
      return lhs !== undefined;
    case "notExists":
    case "doesNotExist":
      return lhs === undefined;
  }

  if (lhs === undefined) {
    // sometimes the LHS is undefined, such as when the player has not typed
    // anything into a text entry field. In this case, we should return a falsy value
    // returning undefined signals that it isn't just that the comparison
    // returned a falsy value, but that the comparison could not yet be made
    if (comparator === "doesNotEqual") return true; // undefined is not equal to anything

    console.log(
      `reference undefined with lhs ${lhs}, rhs ${rhs}, and comparator ${comparator}`
    );
    return undefined;
  }

  if (isNumberOrParsableNumber(lhs) && isNumberOrParsableNumber(rhs)) {
    // check that lhs is a number
    // (types can go crazy here, as this works for strings containing numbers, like lhs="5")
    const numLhs = parseFloat(lhs);
    const numRhs = parseFloat(rhs);
    switch (comparator) {
      case "equals":
        return numLhs === numRhs; // numeric match
      case "doesNotEqual":
        return numLhs !== numRhs;
      case "isAbove":
        return numLhs > numRhs;
      case "isBelow":
        return numLhs < numRhs;
      case "isAtLeast":
        return numLhs >= numRhs;
      case "isAtMost":
        return numLhs <= numRhs;
    }
  }

  if (typeof lhs === "string" && !Number.isNaN(rhs)) {
    switch (comparator) {
      case "lengthAtLeast":
      case "hasLengthAtLeast":
        return lhs.length >= parseFloat(rhs);
      case "lengthAtMost":
      case "hasLengthAtMost":
        return lhs.length <= parseFloat(rhs);
    }
  }

  if (typeof lhs === "string" && typeof rhs === "string") {
    switch (comparator) {
      case "equals":
        return lhs === rhs; // string match
      case "doesNotEqual":
        return lhs !== rhs;
      case "include":
      case "includes":
        return lhs.includes(rhs);
      case "notInclude":
      case "doesNotInclude":
        return !lhs.includes(rhs);
      case "match":
      case "matches":
        return !!lhs.match(new RegExp(trimSlashes(rhs)));
      case "notMatch":
      case "doesNotMatch":
        return !lhs.match(new RegExp(trimSlashes(rhs)));
    }
  }

  if (typeof lhs === "boolean" && typeof rhs === "boolean") {
    switch (comparator) {
      case "equals":
        return lhs === rhs;
      case "doesNotEqual":
        return lhs !== rhs;
    }
  }

  if (Array.isArray(rhs)) {
    switch (comparator) {
      case "oneOf":
      case "isOneOf":
        return Array.isArray(rhs) && rhs.includes(lhs); // check that rhs is an array
      case "notOneOf":
      case "isNotOneOf":
        return Array.isArray(rhs) && !rhs.includes(lhs); // check that rhs is an array
    }
  }

  console.error(`Invalid comparator: ${comparator} for lhs, rhs:`, lhs, rhs);

  return undefined;
}

const getNestedValueByPath = (obj, path) =>
  path.reduce((acc, key) => acc?.[key], obj);

export function useReferenceValues({ reference, position }) {
  // returns a list of values for the reference string
  // because there can be more than one if position is "all" or "percentAgreement"
  const player = usePlayer();
  const game = useGame();
  const players = usePlayers();

  const type = reference.split(".")[0]; // e.g. "survey", "submitButton", "qualtrics", "prompt", "urlParams", "connectionInfo", "browserInfo", "participantInfo"
  let name; // which survey, prompt, etc
  let path; // for surveys or things with multiple fields, which one to get
  let referenceKey;

  if (["survey", "submitButton", "qualtrics"].includes(type)) {
    [, name, ...path] = reference.split(".");
    referenceKey = `${type}_${name}`;
  } else if (type === "prompt") {
    // eslint-disable-next-line prefer-destructuring
    name = reference.split(".")[1];
    referenceKey = `${type}_${name}`;
    path = ["value"]; // shortcut for prompt value, so you don't have to include it in the reference string
  } else if (["urlParams", "connectionInfo", "browserInfo"].includes(type)) {
    [, ...path] = reference.split(".");
    referenceKey = type;
  } else if (["participantInfo", "discussion"].includes(type)) {
    // gets values saved directly on the player object
    [, name, ...path] = reference.split(".");
    referenceKey = name;
  } else {
    throw new Error(`Invalid reference type: ${type}`);
  }

  let referenceSource;
  switch (position) {
    case "shared":
      referenceSource = [game];
      break;
    case "player":
    case undefined:
      referenceSource = [player];
      break;
    case "all":
    case "any":
    case "percentAgreement":
      referenceSource = players;
      break;
    default:
      if (Number.isInteger(parseInt(position))) {
        referenceSource = players.filter(
          (p) => parseInt(p.get("position")) === position
        ); // array
      } else {
        throw new Error(`Invalid position value: ${position}`);
      }
  }

  let referenceValues;
  try {
    const referenceObjects = referenceSource.map((p) => p.get(referenceKey));
    referenceValues = referenceObjects.map((obj) =>
      getNestedValueByPath(obj, path)
    );
  } catch (e) {
    throw new Error(`Error getting reference value for ${reference}:`, e);
  }

  return referenceValues;
}
