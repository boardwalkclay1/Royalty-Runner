// Shared storage for all Works modules
const WORKS_KEY = "rr_works";

function rrLoadWorks() {
  return JSON.parse(localStorage.getItem(WORKS_KEY) || "[]");
}

function rrSaveWorks(list) {
  localStorage.setItem(WORKS_KEY, JSON.stringify(list));
}

function rrAddWork(item) {
  const list = rrLoadWorks();
  list.push(item);
  rrSaveWorks(list);
}

function rrFormatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
