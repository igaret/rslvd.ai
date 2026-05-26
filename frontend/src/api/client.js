import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const unwrapError = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join("; ");
  return error?.message || "Request failed";
};

const request = async (method, path, data) => {
  try {
    const response = await axios({ method, url: `${API}${path}`, data });
    return response.data;
  } catch (error) {
    throw new Error(unwrapError(error));
  }
};

export const getPersonas = () => request("get", "/personas");
export const getSettings = () => request("get", "/settings");
export const saveSettings = (endpointUrl) => request("put", "/settings", { endpoint_url: endpointUrl });
export const testConnection = (endpointUrl, apiKey) =>
  request("post", "/connection/test", { endpoint_url: endpointUrl, api_key: apiKey || undefined });
export const listConversations = () => request("get", "/conversations");
export const getConversation = (id) => request("get", `/conversations/${id}`);
export const createConversation = (payload) => request("post", "/conversations", payload);
export const deleteConversation = (id) => request("delete", `/conversations/${id}`);
export const sendChat = (payload) => request("post", "/chat", payload);