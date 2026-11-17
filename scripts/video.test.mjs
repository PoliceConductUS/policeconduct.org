import assert from "node:assert/strict";
import test from "node:test";
import { getVideoEmbedUrl, requireWatchVideo } from "../src/lib/video.ts";
test("watch identity is the exact stored relationship id", () => {
  const links = [
    { id: "original", title: "Video", url: "https://youtu.be/TKh6X74AEc0" },
  ];
  assert.equal(requireWatchVideo(links, "original").id, "original");
  assert.throws(() => requireWatchVideo(links, "replacement"), /not found/);
  assert.throws(
    () =>
      requireWatchVideo(
        [
          {
            id: "document",
            title: "Document",
            url: "https://example.org/file.pdf",
          },
        ],
        "document",
      ),
    /not found/,
  );
});
test("only supported video URLs embed", () => {
  assert.equal(
    getVideoEmbedUrl("https://www.youtube.com/watch?v=TKh6X74AEc0"),
    "https://www.youtube.com/embed/TKh6X74AEc0",
  );
  assert.equal(
    getVideoEmbedUrl("https://youtu.be/TKh6X74AEc0"),
    "https://www.youtube.com/embed/TKh6X74AEc0",
  );
  assert.equal(getVideoEmbedUrl("https://notyoutube.com/watch?v=fake"), null);
});
