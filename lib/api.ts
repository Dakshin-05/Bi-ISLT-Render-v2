const API_BASE = "http://localhost:8000";

export async function uploadVideo(file: File): Promise<{ text: string; gloss: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/video-to-text`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return { text: data.text || data.gloss || "No text detected", gloss: data.gloss };
}

export async function textToSign(text: string, mode = "model"): Promise<unknown> {
  const res = await fetch(`${API_BASE}/text-to-pose?mode=${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}