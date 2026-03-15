// public/assets/js/session-engine.js
// ES Module — Session Grouping + Metadata + Loading

export function createSession(files) {
  const sessionId = "session_" + crypto.randomUUID();

  return {
    id: sessionId,
    name: "Session " + new Date().toLocaleString(),
    createdAt: Date.now(),
    stems: files.map(file => ({
      id: "stem_" + crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))
  };
}

export function groupFilesIntoSession(files) {
  if (files.length === 1) {
    return createSession(files);
  }

  // Multiple files uploaded at once → treat as a session
  return createSession(files);
}

export function loadSession(session, dbWorks) {
  return session.stems.map(stem => {
    const match = dbWorks.find(w => w.audio?.name === stem.name);
    return {
      stem,
      work: match || null
    };
  });
}
