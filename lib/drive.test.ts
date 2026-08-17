import { describe, it, expect } from "vitest";
import { __setDriveClientForTests, listDriveFiles, downloadDriveFile } from "./drive";

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
