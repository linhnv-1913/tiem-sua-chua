import { getAccessToken } from './auth';

const SHEET_ID = '1bNH-uQr-T6CHpe-LTOC2m5nKVsYTDptjM53KcEYb3SQ';

const getSyncSheetName = async (token: string) => {
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await metaRes.json();
  return meta.sheets[0].properties.title;
}

export const syncStateToCloud = async (state: any) => {
  try {
    const token = await getAccessToken();
    if (!token) return;
    const sheetName = await getSyncSheetName(token);
    
    // Convert state to JSON
    const jsonStr = JSON.stringify(state);
    
    // Chunk string if we ever need to, but for now just A1
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}!A1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${sheetName}!A1`,
        majorDimension: 'ROWS',
        values: [[jsonStr]]
      })
    });
    console.log('Synced to Google Sheets successfully.');
  } catch (err) {
    console.error('Error syncing to sheets:', err);
  }
};

export const fetchStateFromCloud = async (): Promise<any> => {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const sheetName = await getSyncSheetName(token);

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}!A1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.values && data.values[0] && data.values[0][0]) {
      return JSON.parse(data.values[0][0]);
    }
    return null;
  } catch (err) {
    console.error('Error fetching from sheets:', err);
    return null;
  }
};
