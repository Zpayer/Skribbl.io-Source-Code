export let localStorageAvailable = false;

if (typeof localStorage !== "undefined") {
  try {
    localStorage.setItem("feature_test", "yes");
    if (localStorage.getItem("feature_test") === "yes") {
      localStorage.removeItem("feature_test");
      localStorageAvailable = true;
    }
  } catch (e) {
    /* storage blocked */
  }
}

window.localStorageAvailable = localStorageAvailable;


export function getStored(key, fallback) {
  const value = localStorage.getItem(key);
  return value == null ? fallback : value;
}
