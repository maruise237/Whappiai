import { getHost, getProtocol } from './hostUtils';

export const apiUrl = () => {
  const hostname = getHost();
  const protocol = getProtocol();
  return `${protocol}//${hostname}:3000`;
};

export const fetchData = async () => {
  const response = await fetch(`${apiUrl()}/data`);
  return response.json();
};

export const submitData = async (data) => {
  const response = await fetch(`${apiUrl()}/submit`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  return response.json();
};