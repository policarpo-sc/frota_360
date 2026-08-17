import { describe, it, expect } from "vitest";
import {
  __setDriveClientForTests,
  listDriveFiles,
  listFolderContents,
  downloadDriveFile,
} from "./drive";

describe("drive client", () => {
  it("lists files from the configured folder", async () => {
    __setDriveClientForTests({
      files: {
        list: async () => ({
          data: {
            files: [
              {
                id: "abc123",
                name: "Projeto_Ações.xlsx",
                mimeType: "application/vnd.openxmlformats",
                webViewLink: "https://drive.google.com/file/d/abc123/view",
              },
            ],
          },
        }),
        get: async () => ({ data: Buffer.from("") }),
      },
    });

    process.env.GOOGLE_DRIVE_FOLDER_ID = "test-folder";
    const files = await listDriveFiles();
    expect(files).toEqual([
      {
        id: "abc123",
        name: "Projeto_Ações.xlsx",
        mimeType: "application/vnd.openxmlformats",
        webViewLink: "https://drive.google.com/file/d/abc123/view",
      },
    ]);
  });

  it("lists contents of an arbitrary folder id, including subfolders", async () => {
    __setDriveClientForTests({
      files: {
        list: async () => ({
          data: {
            files: [
              {
                id: "folder1",
                name: "01. Pilar Frota",
                mimeType: "application/vnd.google-apps.folder",
                webViewLink: "https://drive.google.com/drive/folders/folder1",
              },
              {
                id: "doc1",
                name: "Ata de reunião.docx",
                mimeType: "application/vnd.openxmlformats",
                webViewLink: "https://drive.google.com/file/d/doc1/view",
              },
            ],
          },
        }),
        get: async () => ({ data: Buffer.from("") }),
      },
    });

    const files = await listFolderContents("some-folder-id");
    expect(files).toEqual([
      {
        id: "folder1",
        name: "01. Pilar Frota",
        mimeType: "application/vnd.google-apps.folder",
        webViewLink: "https://drive.google.com/drive/folders/folder1",
      },
      {
        id: "doc1",
        name: "Ata de reunião.docx",
        mimeType: "application/vnd.openxmlformats",
        webViewLink: "https://drive.google.com/file/d/doc1/view",
      },
    ]);
  });

  it("downloads a file as a Buffer", async () => {
    __setDriveClientForTests({
      files: {
        list: async () => ({ data: { files: [] } }),
        get: async () => ({ data: Buffer.from("hello") }),
      },
    });

    const buffer = await downloadDriveFile("abc123");
    expect(buffer.toString()).toBe("hello");
  });
});
