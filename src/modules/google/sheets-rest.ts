type ValuesResponse = { range?: string; values?: string[][] };

function baseUrl(spreadsheetId: string) {
  return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
}

async function googleFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google Sheets request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function readValues(input: { spreadsheetId: string; range: string; accessToken: string }) {
  const url = `${baseUrl(input.spreadsheetId)}/values/${encodeURIComponent(input.range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  return googleFetch<ValuesResponse>(url, input.accessToken);
}

export async function appendValues(input: { spreadsheetId: string; range: string; values: unknown[][]; accessToken: string }) {
  const url = `${baseUrl(input.spreadsheetId)}/values/${encodeURIComponent(input.range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  return googleFetch(url, input.accessToken, { method: "POST", body: JSON.stringify({ majorDimension: "ROWS", values: input.values }) });
}

export async function updateValues(input: { spreadsheetId: string; range: string; values: unknown[][]; accessToken: string }) {
  const url = `${baseUrl(input.spreadsheetId)}/values/${encodeURIComponent(input.range)}?valueInputOption=USER_ENTERED`;
  return googleFetch(url, input.accessToken, { method: "PUT", body: JSON.stringify({ majorDimension: "ROWS", values: input.values }) });
}
