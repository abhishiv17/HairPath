import { test } from "node:test";
import assert from "node:assert/strict";
import { diffItems } from "../lib/merge.ts";
import { sharedPayloadOk } from "../lib/shared.ts";

test("sync: new on either side travels to the other", () => {
  const d = diffItems([{ id: "a", updatedAt: 5 }], [{ id: "b", updated_at: 5, deleted: false }]);
  assert.deepEqual(d, { pull: ["b"], drop: [], push: ["a"] });
});

test("sync: last write wins", () => {
  const d = diffItems(
    [{ id: "a", updatedAt: 10 }, { id: "b", updatedAt: 3 }, { id: "c", updatedAt: 7 }],
    [{ id: "a", updated_at: 4, deleted: false }, { id: "b", updated_at: 9, deleted: false }, { id: "c", updated_at: 7, deleted: false }],
  );
  assert.deepEqual(d, { pull: ["b"], drop: [], push: ["a"] });
});

test("sync: a delete elsewhere removes the item here, unless it was edited here afterwards", () => {
  const d = diffItems(
    [{ id: "a", updatedAt: 3 }, { id: "b", updatedAt: 20 }],
    [{ id: "a", updated_at: 5, deleted: true }, { id: "b", updated_at: 5, deleted: true }, { id: "c", updated_at: 5, deleted: true }],
  );
  assert.deepEqual(d, { pull: [], drop: ["a"], push: ["b"] });
});

test("shared plan payload: accepts a well-formed plan and rejects junk", () => {
  const ok = {
    v: 1,
    targetName: "Textured crop",
    routeHeadline: "Ready for your next appointment",
    explanation: "",
    baseline: "Ear length",
    photos: [{ label: "Current", src: "data:image/jpeg;base64,AAAA" }],
    chair: [{ when: "Next appointment", title: "Textured crop", ask: "Short sides", details: [] }],
    keep: [],
    cautions: [],
    questions: [],
    note: "",
  };
  assert.equal(sharedPayloadOk(ok), true);
  assert.equal(sharedPayloadOk({ ...ok, v: 2 }), false);
  assert.equal(sharedPayloadOk({ ...ok, chair: "nope" }), false);
  assert.equal(sharedPayloadOk(null), false);
});
