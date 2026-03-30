import axios from "axios";

export const publicApiClient = axios.create({
  baseURL: "/api/proxy",
  headers: { "Content-Type": "application/json" },
});
