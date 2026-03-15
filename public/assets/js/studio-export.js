// public/assets/js/studio-export.js
// ES Module — Export Work, Metadata, Sessions as ZIP Bundles

import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

/* -------------------------------------------------------
   EXPORT SINGLE WORK (audio + metadata.json)
------------------------------------------------------- */
export async function exportWork(work) {
  const zip = new JSZip();

  // Audio
  const audioBlob = work.audioBlob || work.audio?.blob || null;
  if (audioBlob) {
    zip.file(work.audio?.name || `${work.title}.wav`, audioBlob);
  }

  // Metadata
  const metadata = {
    id: work.id,
    title: work.title,
    role: work.role,
    notes: work.notes,
    createdAt: work.createdAt,
    progress: work.progress,
    studioState: work.studioState || {},
    protection: work.protection || {},
    isrc: work.isrc || null,
    iswc: work.iswc || null,
    pro_id: work.pro_id || null,
    mlc_id: work.mlc_id || null,
    release_date: work.release_date || null
  };

  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${work.title}-work.zip`);
}

/* -------------------------------------------------------
   EXPORT SESSION (all stems + metadata.json)
------------------------------------------------------- */
export async function exportSession(session, works) {
  const zip = new JSZip();

  const sessionFolder = zip.folder(session.name.replace(/\s+/g, "_"));

  // Add stems
  for (const stem of session.stems) {
    const match = works.find(w => w.audio?.name === stem.name);

    if (match && match.audioBlob) {
      sessionFolder.file(stem.name, match.audioBlob);
    }
  }

  // Metadata
  const metadata = {
    id: session.id,
    name: session.name,
    createdAt: session.createdAt,
    stems: session.stems,
    worksLinked: works.map(w => w.id)
  };

  sessionFolder.file("session.json", JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${session.name}-session.zip`);
}

/* -------------------------------------------------------
   EXPORT METADATA ONLY
------------------------------------------------------- */
export function exportMetadata(work) {
  const metadata = {
    id: work.id,
    title: work.title,
    role: work.role,
    notes: work.notes,
    createdAt: work.createdAt,
    progress: work.progress,
    protection: work.protection,
    isrc: work.isrc,
    iswc: work.iswc,
    pro_id: work.pro_id,
    mlc_id: work.mlc_id,
    release_date: work.release_date
  };

  const blob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: "application/json"
  });

  triggerDownload(blob, `${work.title}-metadata.json`);
}

/* -------------------------------------------------------
   EXPORT FULL BACKUP (all works + metadata)
------------------------------------------------------- */
export async function exportFullBackup(works) {
  const zip = new JSZip();
  const folder = zip.folder("RoyaltyRunner_Backup");

  for (const work of works) {
    const workFolder = folder.folder(work.title.replace(/\s+/g, "_"));

    // Audio
    if (work.audioBlob) {
      workFolder.file(work.audio?.name || `${work.title}.wav`, work.audioBlob);
    }

    // Metadata
    workFolder.file(
      "metadata.json",
      JSON.stringify(
        {
          id: work.id,
          title: work.title,
          role: work.role,
          notes: work.notes,
          createdAt: work.createdAt,
          progress: work.progress,
          protection: work.protection,
          studioState: work.studioState,
          isrc: work.isrc,
          iswc: work.iswc,
          pro_id: work.pro_id,
          mlc_id: work.mlc_id,
          release_date: work.release_date
        },
        null,
        2
      )
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `RoyaltyRunner-FullBackup.zip`);
}

/* -------------------------------------------------------
   INTERNAL — Trigger File Download
------------------------------------------------------- */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
