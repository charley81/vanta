import { draftMode } from "next/headers";

import { EditorialVisualEditingClient } from "./editorial-visual-editing.client";

export async function EditorialVisualEditing() {
  const { isEnabled } = await draftMode();
  return isEnabled ? <EditorialVisualEditingClient /> : null;
}
